# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Content domain endpoints (events + resources), ported from Node with response parity.

BUG-4: admin-only mutations return 403 for non-admins (the Node handlers returned a
plain object and hung); update validates properly and only touches provided fields.
"""
from __future__ import annotations

import math

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role, User
from accounts.services import record_activity
from accounts.user_services import consultant_detail_payload
from core.audit import client_ip, record_audit
from core.permissions import IsAdminRole

from .models import Event, Resource
from .serializers import (
    EventCreateSerializer,
    EventSerializer,
    EventUpdateSerializer,
    ResourceSerializer,
    ResourceUploadSerializer,
)


def _int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


# ─── Events ──────────────────────────────────────────────────────────────────────
class EventCreateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request: Request) -> Response:
        ser = EventCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(
                {"success": False, "message": "Validation errors", "errors": ser.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        event = Event.objects.create(**ser.validated_data)
        record_activity(request.user, "event_create", f"Created event: {event.title}")
        record_audit(request.user, "event.create", target_type="Event", target_id=event.id, ip=client_ip(request))
        return Response(
            {"success": True, "message": "Event created successfully", "id": str(event.id)},
            status=status.HTTP_200_OK,
        )


class EventListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        # Node read these off the request body on a GET; accept query params first, body as fallback.
        src = request.query_params if request.query_params else request.data
        page = max(_int(src.get("page", 1), 1), 1)
        limit = max(_int(src.get("limit", 5), 5), 1)
        date_from, date_to, location = src.get("date_from"), src.get("date_to"), src.get("location")

        qs = Event.objects.all()
        if date_from:
            qs = qs.filter(event_date__gte=date_from)
        if date_to:
            qs = qs.filter(event_date__lte=date_to)
        if location:
            qs = qs.filter(location__icontains=location)
        qs = qs.order_by("event_date")

        total = qs.count()
        offset = (page - 1) * limit
        events = EventSerializer(qs[offset : offset + limit], many=True).data
        return Response(
            {
                "success": True,
                "message": "Events fetched successfully",
                "events": events,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": math.ceil(total / limit) if limit else 0,
                },
            },
            status=status.HTTP_200_OK,
        )


class EventDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        event = Event.objects.filter(pk=pk).first()
        if event is None:
            return Response(
                {"success": False, "message": "Event not found"}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            {"success": True, "message": "Event details fetched successfully", "event": EventSerializer(event).data},
            status=status.HTTP_200_OK,
        )


class EventDeleteView(APIView):
    permission_classes = [IsAdminRole]

    def delete(self, request: Request, pk) -> Response:
        deleted, _ = Event.objects.filter(pk=pk).delete()
        if not deleted:
            return Response(
                {"success": False, "message": "Event not found"}, status=status.HTTP_400_BAD_REQUEST
            )
        record_audit(request.user, "event.delete", target_type="Event", target_id=pk, ip=client_ip(request))
        return Response(
            {"success": True, "message": "Event deleted successfully"}, status=status.HTTP_200_OK
        )


class EventUpdateView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request: Request, pk) -> Response:
        event = Event.objects.filter(pk=pk).first()
        if event is None:
            return Response(
                {"success": False, "message": "Event not found"}, status=status.HTTP_400_BAD_REQUEST
            )
        ser = EventUpdateSerializer(data=request.data, partial=True)
        if not ser.is_valid():
            return Response(
                {"success": False, "message": "Validation errors", "errors": ser.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Proper PATCH: only touch supplied fields (Node nulled omitted ones).
        for field, value in ser.validated_data.items():
            setattr(event, field, value)
        event.save()
        record_audit(request.user, "event.update", target_type="Event", target_id=pk, ip=client_ip(request))
        return Response(
            {"success": True, "message": "Event updated successfully", "updatedEvent": EventSerializer(event).data},
            status=status.HTTP_200_OK,
        )


# ─── Resources ───────────────────────────────────────────────────────────────────
class ResourceUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        ser = ResourceUploadSerializer(data=request.data)
        if not ser.is_valid():
            return Response(
                {"success": False, "message": "Title, type, and file_url are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resource = Resource.objects.create(consultant=request.user, **ser.validated_data)
        return Response({"success": True, "id": str(resource.id)}, status=status.HTTP_201_CREATED)


class ResourceListView(APIView):
    permission_classes = [AllowAny]  # public catalogue (Node route had no auth)

    def get(self, request: Request) -> Response:
        qs = Resource.objects.all()  # SoftDeleteManager already hides deleted rows
        rtype, category = request.query_params.get("type"), request.query_params.get("category")
        if rtype:
            qs = qs.filter(type=rtype)
        if category:
            qs = qs.filter(category=category)
        qs = qs.order_by("-created_at")
        return Response(
            {"success": True, "resources": ResourceSerializer(qs, many=True).data},
            status=status.HTTP_200_OK,
        )


class SearchView(APIView):
    """GET /api/search?q= → federated results across resources + consultants (P3)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response({"success": True, "resources": [], "consultants": []}, status=status.HTTP_200_OK)

        resources = Resource.objects.filter(
            Q(title__icontains=q) | Q(category__icontains=q) | Q(author__icontains=q)
        ).order_by("-created_at")[:20]
        consultants = (
            User.objects.filter(role=Role.CONSULTANT, deleted_at__isnull=True)
            .filter(
                Q(profile__first_name__icontains=q)
                | Q(profile__last_name__icontains=q)
                | Q(consultant_detail__profession__icontains=q)
                | Q(email__icontains=q)
            )
            .distinct()[:20]
        )
        return Response(
            {
                "success": True,
                "resources": ResourceSerializer(resources, many=True).data,
                "consultants": [consultant_detail_payload(u) for u in consultants],
            },
            status=status.HTTP_200_OK,
        )
