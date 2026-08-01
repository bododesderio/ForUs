# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""P3 tests — rich check-in, profile stats (streak/sessions/minutes/trend), streak task."""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ConsultantDetails, Profile, Role, User
from appointments.models import Appointment, AppointmentStatus
from wellness.models import Mood
from wellness.tasks import recompute_streaks

pytestmark = pytest.mark.django_db


def _user(email="u@forus.app", role=Role.USER):
    u = User.objects.create_user(email=email, password="correct-horse-9", role=role)
    Profile.objects.create(user=u, username=email.split("@")[0])
    if role == Role.CONSULTANT:
        ConsultantDetails.objects.create(user=u)
    return u


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_rich_checkin_persists_color_tags_note():
    user = _user()
    resp = _client(user).post(
        "/api/mood",
        {"date": "2026-08-01", "mood": 4, "mood_color": "#FFD166", "feeling_tags": ["calm", "hopeful"], "note": "good day"},
        format="json",
    )
    assert resp.status_code == 200
    m = Mood.objects.get(user=user, mood_date="2026-08-01")
    assert m.mood_color == "#FFD166" and m.feeling_tags == ["calm", "hopeful"] and m.note == "good day"


def test_stats_streak_sessions_minutes_and_trend():
    user = _user()
    consultant = _user("c@forus.app", Role.CONSULTANT)
    today = timezone.now().date()
    # 3-day streak ending today.
    for d in range(3):
        Mood.objects.create(user=user, mood_date=today - timedelta(days=d), mood=3)
    # ...with a gap before it that must not extend the streak.
    Mood.objects.create(user=user, mood_date=today - timedelta(days=5), mood=2)
    # Two completed sessions (60 + 90 minutes).
    for mins in (60, 90):
        Appointment.objects.create(
            user=user, consultant=consultant, appointment_datetime=timezone.now() - timedelta(days=1),
            duration_minutes=mins, status=AppointmentStatus.COMPLETED,
        )

    data = _client(user).get("/api/profile/stats").data
    assert data["streak_days"] == 3
    assert data["total_sessions"] == 2
    assert data["total_practice_minutes"] == 150
    assert len(data["mood_trend_30d"]) == 4  # 3 streak days + 1 older, all within 30d


def test_recompute_streaks_task_caches_on_profile():
    user = _user()
    today = timezone.now().date()
    Mood.objects.create(user=user, mood_date=today, mood=3)
    Mood.objects.create(user=user, mood_date=today - timedelta(days=1), mood=3)
    assert recompute_streaks() >= 1
    assert Profile.objects.get(user=user).streak_days == 2


def test_stats_requires_auth():
    assert APIClient().get("/api/profile/stats").status_code == 401


def test_search_federates_resources_and_consultants():
    from content.models import Resource

    seeker = _user("s@forus.app")
    consultant = _user("dr@forus.app", Role.CONSULTANT)
    Profile.objects.filter(user=consultant).update(first_name="Serena", last_name="Okello")
    ConsultantDetails.objects.filter(user=consultant).update(profession="Anxiety therapist")
    Resource.objects.create(consultant=consultant, title="Calm breathing", type="audio", file_url="https://r2/c.mp3")

    resp = _client(seeker).get("/api/search", {"q": "calm"})
    assert resp.status_code == 200
    assert any("Calm" in r["title"] for r in resp.data["resources"])

    by_name = _client(seeker).get("/api/search", {"q": "Serena"})
    assert any(c["username"] is not None for c in by_name.data["consultants"])
    assert _client(seeker).get("/api/search", {"q": ""}).data == {"success": True, "resources": [], "consultants": []}
