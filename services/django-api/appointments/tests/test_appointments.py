# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Appointment tests — creation/conflict, state machine, reviews, auto-cancel, IDOR guard."""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ConsultantDetails, Profile, Role, User
from appointments.models import Appointment, AppointmentStatus, Review

pytestmark = pytest.mark.django_db

PW = "correct-horse-9"


def make_user(email, role=Role.USER, first="A", last="B") -> User:
    u = User.objects.create_user(email=email, password=PW, role=role)
    Profile.objects.create(user=u, username=email.split("@")[0], first_name=first, last_name=last)
    if role == Role.CONSULTANT:
        ConsultantDetails.objects.create(user=u)
    return u


def client_for(user) -> APIClient:
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def future(hours=24):
    return (timezone.now() + timedelta(hours=hours)).replace(microsecond=0)


@pytest.fixture
def cast():
    user = make_user("u@forus.app", Role.USER)
    consultant = make_user("c@forus.app", Role.CONSULTANT)
    return user, consultant


# ─── Create + conflict ───────────────────────────────────────────────────────────
def test_user_creates_appointment_with_bug6_default_duration(cast):
    user, consultant = cast
    resp = client_for(user).post(
        "/api/appointments/create",
        {"consultant_id": str(consultant.id), "appointment_datetime": future().isoformat()},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["success"] is True
    # BUG-6: default duration is the model's 60, not the Node service's 90.
    assert resp.data["appointment"]["duration_minutes"] == 60


def test_non_user_cannot_create(cast):
    _, consultant = cast
    resp = client_for(consultant).post(
        "/api/appointments/create",
        {"consultant_id": str(consultant.id), "appointment_datetime": future().isoformat()},
        format="json",
    )
    assert resp.status_code == 403
    assert resp.data["error"] == "Only users can create appointments"


def test_create_validation_and_unknown_consultant(cast):
    user, _ = cast
    c = client_for(user)
    assert c.post("/api/appointments/create", {}, format="json").status_code == 400
    bad = c.post(
        "/api/appointments/create",
        {"consultant_id": "00000000-0000-0000-0000-000000000000", "appointment_datetime": future().isoformat()},
        format="json",
    )
    assert bad.status_code == 400
    assert bad.data["message"] == "Consultant not found or inactive"


def test_conflicting_slot_is_rejected(cast):
    user, consultant = cast
    when = future().isoformat()
    body = {"consultant_id": str(consultant.id), "appointment_datetime": when}
    assert client_for(user).post("/api/appointments/create", body, format="json").status_code == 201
    clash = client_for(user).post("/api/appointments/create", body, format="json")
    assert clash.status_code == 400
    assert clash.data["message"] == "Time slot is already booked"


# ─── State machine ───────────────────────────────────────────────────────────────
def _pending(user, consultant, when=None) -> Appointment:
    return Appointment.objects.create(
        user=user, consultant=consultant, appointment_datetime=when or future(),
        duration_minutes=60, status=AppointmentStatus.PENDING,
    )


def test_confirm_requires_consultant_owner_and_pending(cast):
    user, consultant = cast
    appt = _pending(user, consultant)
    other = make_user("c2@forus.app", Role.CONSULTANT)

    assert client_for(user).post(f"/api/appointments/{appt.id}/confirm").status_code == 403
    assert client_for(other).post(f"/api/appointments/{appt.id}/confirm").status_code == 400  # not owner
    ok = client_for(consultant).post(f"/api/appointments/{appt.id}/confirm")
    assert ok.status_code == 200 and ok.data["message"] == "Appointment confirmed"
    # No longer pending → cannot confirm again.
    assert client_for(consultant).post(f"/api/appointments/{appt.id}/confirm").status_code == 400


def test_reject_only_pending(cast):
    user, consultant = cast
    appt = _pending(user, consultant)
    ok = client_for(consultant).post(f"/api/appointments/{appt.id}/reject")
    assert ok.status_code == 200 and ok.data["message"] == "Appointment rejected"


def test_user_can_cancel_but_not_arbitrary_status(cast):
    user, consultant = cast
    appt = _pending(user, consultant)
    # Users may cancel...
    assert client_for(user).post(f"/api/appointments/{appt.id}/cancel", {}, format="json").status_code == 200
    appt.refresh_from_db()
    assert appt.status == AppointmentStatus.CANCELLED
    # ...but not push arbitrary statuses via /status.
    other = _pending(user, consultant, when=future(48))
    bad = client_for(user).patch(f"/api/appointments/{other.id}/status", {"status": "completed"}, format="json")
    assert bad.status_code == 400
    assert bad.data["message"] == "Users can only cancel appointments or start sessions"


def test_reschedule_conflict_and_ownership(cast):
    user, consultant = cast
    a = _pending(user, consultant, when=future(24))
    b = _pending(user, consultant, when=future(48))
    # Reschedule b onto a's slot → conflict.
    clash = client_for(user).post(
        f"/api/appointments/{b.id}/reschedule", {"new_datetime": a.appointment_datetime.isoformat()}, format="json"
    )
    assert clash.status_code == 400 and clash.data["message"] == "Time slot is already booked"
    # A stranger cannot reschedule.
    stranger = make_user("u2@forus.app", Role.USER)
    assert client_for(stranger).post(
        f"/api/appointments/{b.id}/reschedule", {"new_datetime": future(72).isoformat()}, format="json"
    ).status_code == 400


# ─── Auto-cancel ─────────────────────────────────────────────────────────────────
def test_expired_pending_is_auto_cancelled_on_list(cast):
    user, consultant = cast
    stale = Appointment.objects.create(
        user=user, consultant=consultant, appointment_datetime=timezone.now() - timedelta(hours=2),
        duration_minutes=60, status=AppointmentStatus.PENDING,
    )
    resp = client_for(user).get("/api/appointments/get")
    assert resp.status_code == 200
    stale.refresh_from_db()
    assert stale.status == AppointmentStatus.CANCELLED
    assert stale.cancellation_reason == "Missed/Expired"


# ─── Lists + IDOR guard ──────────────────────────────────────────────────────────
def test_list_perspective_and_pagination(cast):
    user, consultant = cast
    _pending(user, consultant)
    resp = client_for(user).get("/api/appointments/get")
    assert resp.data["success"] is True
    assert resp.data["appointments"][0]["consultant_name"] == "A B"
    assert set(resp.data["pagination"]) == {"page", "limit", "total", "totalPages", "hasNext", "hasPrev"}


def test_user_list_blocks_cross_user_access(cast):
    user, consultant = cast
    attacker = make_user("attacker@forus.app", Role.USER)
    # Attacker cannot read the victim's appointment list (IDOR guard).
    assert client_for(attacker).get(f"/api/appointments/user/{user.id}").status_code == 403
    # Owner and admin can.
    assert client_for(user).get(f"/api/appointments/user/{user.id}").status_code == 200
    admin = make_user("admin@forus.app", Role.ADMIN)
    assert client_for(admin).get(f"/api/appointments/user/{user.id}").status_code == 200


def test_availability_requires_dates(cast):
    _, consultant = cast
    assert client_for(consultant).get(f"/api/appointments/consultant/{consultant.id}/availability").status_code == 400
    ok = client_for(consultant).get(
        f"/api/appointments/consultant/{consultant.id}/availability",
        {"date_from": future(1).isoformat(), "date_to": future(99).isoformat()},
    )
    assert ok.status_code == 200 and ok.data["success"] is True


# ─── Reviews ─────────────────────────────────────────────────────────────────────
def test_review_requires_completed_appointment_and_is_unique(cast):
    user, consultant = cast
    c = client_for(user)
    # No completed appointment yet.
    denied = c.post(f"/api/appointments/{consultant.id}/review", {"rating": 5}, format="json")
    assert denied.status_code == 400
    assert "completed appointment" in denied.data["message"]

    Appointment.objects.create(
        user=user, consultant=consultant, appointment_datetime=future(), duration_minutes=60,
        status=AppointmentStatus.COMPLETED,
    )
    ok = c.post(f"/api/appointments/{consultant.id}/review", {"rating": 5, "review_text": "great"}, format="json")
    assert ok.status_code == 200
    consultant.consultant_detail.first()  # sanity: details exist
    assert ConsultantDetails.objects.get(user=consultant).rating == 5.0
    # Duplicate review rejected.
    dup = c.post(f"/api/appointments/{consultant.id}/review", {"rating": 3}, format="json")
    assert dup.status_code == 400 and dup.data["message"] == "Review already exists for this consultant"


def test_public_consultant_reviews_pagination(cast):
    user, consultant = cast
    appt = Appointment.objects.create(
        user=user, consultant=consultant, appointment_datetime=future(), duration_minutes=60,
        status=AppointmentStatus.COMPLETED,
    )
    Review.objects.create(appointment=appt, consultant=consultant, user=user, rating=4, review_text="ok")
    # Public — no auth.
    resp = APIClient().get(f"/api/appointments/consultants/{consultant.id}/reviews")
    assert resp.status_code == 200
    assert resp.data["pagination"]["total_reviews"] == 1
    assert resp.data["statistics"]["average_rating"] == 4.0
    assert resp.data["reviews"][0]["user_name"] == "A B"


def test_reviews_bad_pagination_params(cast):
    _, consultant = cast
    assert APIClient().get(
        f"/api/appointments/consultants/{consultant.id}/reviews", {"limit": 999}
    ).status_code == 400


# ─── Block slot ──────────────────────────────────────────────────────────────────
def test_block_slot_consultant_only_and_no_duplicate(cast):
    user, consultant = cast
    when = future().isoformat()
    assert client_for(user).post("/api/appointments/block", {"appointment_datetime": when}, format="json").status_code == 403
    ok = client_for(consultant).post("/api/appointments/block", {"appointment_datetime": when}, format="json")
    assert ok.status_code == 201
    dup = client_for(consultant).post("/api/appointments/block", {"appointment_datetime": when}, format="json")
    assert dup.status_code == 400 and dup.data["message"] == "Slot already blocked"
