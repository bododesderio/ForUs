# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Therapist-tools tests (P8) — SOAP notes, earnings, clients, per-client mood trend, gating."""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ConsultantDetails, Profile, Role, User
from appointments.models import Appointment, AppointmentStatus
from consultant.models import SessionNote
from wellness.models import Mood

pytestmark = pytest.mark.django_db


def _user(email, role=Role.USER, rate="0"):
    u = User.objects.create_user(email=email, password="correct-horse-9", role=role)
    Profile.objects.create(user=u, username=email.split("@")[0], first_name="A", last_name="B")
    if role == Role.CONSULTANT:
        ConsultantDetails.objects.create(user=u, session_rate=Decimal(rate), currency="UGX")
    return u


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _appt(user, consultant, status=AppointmentStatus.COMPLETED, days_ago=1):
    return Appointment.objects.create(
        user=user, consultant=consultant,
        appointment_datetime=timezone.now() - timedelta(days=days_ago),
        duration_minutes=60, status=status,
    )


# ─── Notes ───────────────────────────────────────────────────────────────────────
def test_notes_upsert_and_get_by_owning_consultant():
    user, consultant = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    appt = _appt(user, consultant)
    cc = _client(consultant)
    post = cc.post(
        f"/api/consultant/notes/{appt.id}",
        {"subjective": "reports anxiety", "plan": "weekly CBT", "shared_with_client": True},
        format="json",
    )
    assert post.status_code == 200
    assert post.data["note"]["plan"] == "weekly CBT"
    # Upsert (one note per appointment).
    cc.post(f"/api/consultant/notes/{appt.id}", {"assessment": "GAD"}, format="json")
    assert SessionNote.objects.filter(appointment=appt).count() == 1
    assert cc.get(f"/api/consultant/notes/{appt.id}").data["note"]["assessment"] == "GAD"


def test_notes_only_for_owning_consultant():
    user, consultant = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    other = _user("c2@forus.app", Role.CONSULTANT)
    appt = _appt(user, consultant)
    assert _client(other).get(f"/api/consultant/notes/{appt.id}").status_code == 404  # not their appointment
    assert _client(user).get(f"/api/consultant/notes/{appt.id}").status_code == 403  # not a consultant


# ─── Earnings ────────────────────────────────────────────────────────────────────
def test_earnings_from_rate_all_pending():
    user, consultant = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT, rate="100000")
    for _ in range(3):
        _appt(user, consultant, days_ago=0)  # 3 completed sessions dated today (this month)
    data = _client(consultant).get("/api/consultant/earnings", {"period": "month"}).data["earnings"]
    assert data["sessions"] == 3
    assert data["gross"] == "300000.00"
    assert data["platform_fee"] == "75000.00"  # 25%
    assert data["net"] == "225000.00" and data["pending"] == "225000.00" and data["settled"] == "0.00"
    assert data["currency"] == "UGX"


# ─── Clients + mood trend ────────────────────────────────────────────────────────
def test_clients_lists_distinct_with_session_counts():
    consultant = _user("c@forus.app", Role.CONSULTANT)
    u1, u2 = _user("u1@forus.app"), _user("u2@forus.app")
    _appt(u1, consultant)
    _appt(u1, consultant)
    _appt(u2, consultant, status=AppointmentStatus.CONFIRMED)
    rows = _client(consultant).get("/api/consultant/clients").data["clients"]
    by_id = {r["id"]: r for r in rows}
    assert len(rows) == 2
    assert by_id[str(u1.id)]["session_count"] == 2  # two completed
    assert by_id[str(u2.id)]["session_count"] == 0  # only a confirmed (not completed)


def test_client_mood_trend_privacy():
    consultant = _user("c@forus.app", Role.CONSULTANT)
    mine, stranger = _user("mine@forus.app"), _user("stranger@forus.app")
    _appt(mine, consultant)
    Mood.objects.create(user=mine, mood_date=timezone.now().date(), mood=4)

    ok = _client(consultant).get(f"/api/consultant/clients/{mine.id}/mood-trend")
    assert ok.status_code == 200 and len(ok.data["mood_trend"]) == 1
    # No appointment relationship → refused.
    assert _client(consultant).get(f"/api/consultant/clients/{stranger.id}/mood-trend").status_code == 403


def test_tools_require_consultant_role():
    user = _user("u@forus.app")
    assert _client(user).get("/api/consultant/earnings").status_code == 403
    assert _client(user).get("/api/consultant/clients").status_code == 403
    assert APIClient().get("/api/consultant/clients").status_code == 401
