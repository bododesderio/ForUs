# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Chat REST endpoints, ported from ChatController.js. Message *sending* is realtime
(FastAPI WS, R4b); these cover rooms, membership, and history reads.

SEC-2: room history requires membership; join is authorized (see chat.services.can_join).
Stream Chat is dropped — the `/token` and `/webhook` routes are gone (token issuance
moves to the WS-ticket endpoint in R4b).
"""
from __future__ import annotations

from django.db import transaction
from django.db.models import OuterRef, Subquery
from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User

from .models import ChatMember, ChatMemberRole, ChatMessage, ChatRoom, ChatRoomType
from .services import _iso, can_join, is_member, message_payload, profiles_for


class RoomsView(APIView):
    """POST /api/chat/rooms → create; GET /api/chat/rooms → the caller's rooms."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        data = request.data
        room_type = data.get("type") or ChatRoomType.MESSAGING
        with transaction.atomic():
            room = ChatRoom.objects.create(
                name=data.get("name"), type=room_type, created_by=request.user
            )
            ChatMember.objects.create(room=room, user=request.user, role=ChatMemberRole.OWNER)
            # Add supplied members that map to real users (skip the creator / duplicates).
            wanted = {
                str(m["user_id"]): (m.get("role") or ChatMemberRole.MEMBER)
                for m in (data.get("members") or [])
                if m.get("user_id") and str(m["user_id"]) != str(request.user.id)
            }
            for user in User.objects.filter(id__in=list(wanted)):
                ChatMember.objects.get_or_create(
                    room=room, user=user, defaults={"role": wanted[str(user.id)]}
                )
        if room.name is None:
            room.name = str(room.id)
            room.save(update_fields=["name"])
        return Response(
            {"success": True, "room_id": str(room.id), "message": "Chat room created successfully"},
            status=http.HTTP_200_OK,
        )

    def get(self, request: Request) -> Response:
        latest = ChatMessage.objects.filter(room_id=OuterRef("room_id")).order_by("-created_at")
        memberships = (
            ChatMember.objects.filter(user=request.user)
            .select_related("room")
            .annotate(
                last_message=Subquery(latest.values("text")[:1]),
                last_message_at=Subquery(latest.values("created_at")[:1]),
            )
            .order_by("-room__updated_at")
        )
        rooms = [
            {
                "id": str(cm.room_id),
                "name": cm.room.name,
                "type": cm.room.type,
                "updated_at": _iso(cm.room.updated_at),
                "role": cm.role,
                "joined_at": _iso(cm.joined_at),
                "last_message": cm.last_message,
                "last_message_at": _iso(cm.last_message_at),
            }
            for cm in memberships
        ]
        return Response({"success": True, "rooms": rooms}, status=http.HTTP_200_OK)


class RoomMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, room_id) -> Response:
        if not is_member(room_id, request.user.id):
            return Response(
                {"success": False, "message": "Not a member of this room"}, status=http.HTTP_403_FORBIDDEN
            )
        try:
            limit = min(int(request.query_params.get("limit", 50)), 100)
        except (TypeError, ValueError):
            limit = 50
        qs = ChatMessage.objects.filter(room_id=room_id)  # soft-deleted excluded by manager
        before = request.query_params.get("before")
        if before:
            qs = qs.filter(created_at__lt=before)
        msgs = list(qs.order_by("-created_at")[:limit])
        profiles = profiles_for(msgs)
        messages = [message_payload(m, profiles) for m in reversed(msgs)]
        return Response({"success": True, "messages": messages}, status=http.HTTP_200_OK)


class JoinRoomView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, room_id) -> Response:
        room = ChatRoom.objects.filter(pk=room_id).first()
        if room is None:
            return Response(
                {"success": False, "message": "Room not found"}, status=http.HTTP_404_NOT_FOUND
            )
        if not can_join(room, request.user):
            return Response(
                {"success": False, "message": "Not authorized to join this room"},
                status=http.HTTP_403_FORBIDDEN,
            )
        ChatMember.objects.get_or_create(
            room=room, user=request.user, defaults={"role": ChatMemberRole.MEMBER}
        )
        return Response({"success": True, "message": "Joined room"}, status=http.HTTP_200_OK)
