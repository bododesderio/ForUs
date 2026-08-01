# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Chat REST tests — room create/list, history membership gate (SEC-2), authorized join."""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ConsultantDetails, Profile, Role, User
from appointments.models import Appointment, AppointmentStatus
from chat.models import ChatMember, ChatMemberRole, ChatMessage

pytestmark = pytest.mark.django_db
PW = "correct-horse-9"


def make(email, role=Role.USER):
    u = User.objects.create_user(email=email, password=PW, role=role)
    Profile.objects.create(user=u, username=email.split("@")[0], first_name=email[0].upper(), last_name="X")
    if role == Role.CONSULTANT:
        ConsultantDetails.objects.create(user=u)
    return u


def client_for(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_create_room_makes_creator_owner_and_adds_members():
    owner = make("owner@forus.app")
    other = make("member@forus.app")
    resp = client_for(owner).post(
        "/api/chat/rooms",
        {"name": "Room 1", "members": [{"user_id": str(other.id), "role": "member"}]},
        format="json",
    )
    assert resp.status_code == 200
    room_id = resp.data["room_id"]
    assert ChatMember.objects.get(room_id=room_id, user=owner).role == ChatMemberRole.OWNER
    assert ChatMember.objects.filter(room_id=room_id, user=other).exists()


def test_user_rooms_list_includes_last_message():
    owner = make("o@forus.app")
    c = client_for(owner)
    room_id = c.post("/api/chat/rooms", {"name": "R"}, format="json").data["room_id"]
    ChatMessage.objects.create(room_id=room_id, user=owner, text="latest hello")
    resp = c.get("/api/chat/rooms")
    assert resp.status_code == 200
    assert resp.data["rooms"][0]["last_message"] == "latest hello"
    assert resp.data["rooms"][0]["role"] == ChatMemberRole.OWNER


def test_messages_require_membership_sec2():
    owner = make("o@forus.app")
    outsider = make("out@forus.app")
    room_id = client_for(owner).post("/api/chat/rooms", {"name": "Private"}, format="json").data["room_id"]
    ChatMessage.objects.create(room_id=room_id, user=owner, text="secret")

    # Non-member is refused the history (SEC-2).
    denied = client_for(outsider).get(f"/api/chat/rooms/{room_id}/messages")
    assert denied.status_code == 403
    assert denied.data["message"] == "Not a member of this room"

    ok = client_for(owner).get(f"/api/chat/rooms/{room_id}/messages")
    assert ok.status_code == 200
    assert ok.data["messages"][0]["text"] == "secret"
    assert ok.data["messages"][0]["username"] == "o"


def test_join_denied_on_messaging_but_allowed_on_open_room():
    owner = make("o@forus.app")
    stranger = make("s@forus.app")
    private_id = client_for(owner).post("/api/chat/rooms", {"name": "1:1", "type": "messaging"}, format="json").data["room_id"]
    open_id = client_for(owner).post("/api/chat/rooms", {"name": "Group", "type": "team"}, format="json").data["room_id"]

    # SEC-2: cannot self-join an arbitrary messaging room...
    assert client_for(stranger).post(f"/api/chat/rooms/{private_id}/join").status_code == 403
    # ...but open (team/livestream) rooms allow it.
    assert client_for(stranger).post(f"/api/chat/rooms/{open_id}/join").status_code == 200
    assert ChatMember.objects.filter(room_id=open_id, user=stranger).exists()


def test_join_allowed_when_appointment_links_to_a_member():
    consultant = make("c@forus.app", Role.CONSULTANT)
    patient = make("p@forus.app", Role.USER)
    # Consultant owns a messaging room; patient shares an appointment with them.
    room_id = client_for(consultant).post("/api/chat/rooms", {"name": "Therapy", "type": "messaging"}, format="json").data["room_id"]
    Appointment.objects.create(
        user=patient, consultant=consultant, appointment_datetime=timezone.now() + timedelta(days=1),
        duration_minutes=60, status=AppointmentStatus.CONFIRMED,
    )
    assert client_for(patient).post(f"/api/chat/rooms/{room_id}/join").status_code == 200


def test_join_unknown_room_404():
    assert client_for(make("u@forus.app")).post(
        "/api/chat/rooms/00000000-0000-0000-0000-000000000000/join"
    ).status_code == 404
