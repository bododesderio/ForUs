# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Chat REST helpers: membership checks, SEC-2 join authorization, and payload builders.

SEC-2: a user may only be added to a room when they are already a member, the room is
an open type (livestream/team), or an appointment links them to an existing member
(the therapist↔patient relationship). Self-joining an arbitrary messaging room is denied.
"""
from __future__ import annotations

from django.db.models import Q

from accounts.models import Profile
from appointments.models import Appointment

from .models import ChatMember, ChatMessage, ChatRoom, ChatRoomType

OPEN_ROOM_TYPES = {ChatRoomType.LIVESTREAM, ChatRoomType.TEAM}


def is_member(room_id, user_id) -> bool:
    return ChatMember.objects.filter(room_id=room_id, user_id=user_id).exists()


def can_join(room: ChatRoom, user) -> bool:
    """SEC-2 authorization for POST /rooms/:id/join."""
    if is_member(room.id, user.id):
        return True
    if room.type in OPEN_ROOM_TYPES:
        return True
    # Messaging room: allow only if an appointment ties the requester to a member.
    member_ids = list(ChatMember.objects.filter(room=room).values_list("user_id", flat=True))
    if not member_ids:
        return False
    return Appointment.objects.filter(
        Q(user=user, consultant_id__in=member_ids) | Q(consultant=user, user_id__in=member_ids)
    ).exists()


def _iso(v):
    return v.isoformat() if v is not None else None


def message_payload(m: ChatMessage, profiles: dict) -> dict:
    """A chat_messages row plus the author's profile fields (Node getRoomMessages shape)."""
    p = profiles.get(m.user_id)
    return {
        "id": str(m.id),
        "room_id": str(m.room_id),
        "user_id": str(m.user_id),
        "text": m.text,
        "attachments": m.attachments,
        "mentioned_users": m.mentioned_users,
        "parent_id": str(m.parent_id) if m.parent_id else None,
        "reaction_counts": m.reaction_counts,
        "reply_count": m.reply_count,
        "created_at": _iso(m.created_at),
        "updated_at": _iso(m.updated_at),
        "username": getattr(p, "username", None),
        "first_name": getattr(p, "first_name", None),
        "last_name": getattr(p, "last_name", None),
        "profile_image": getattr(p, "profile_image", None),
    }


def profiles_for(messages) -> dict:
    ids = {m.user_id for m in messages}
    return {p.user_id: p for p in Profile.objects.filter(user_id__in=ids)}
