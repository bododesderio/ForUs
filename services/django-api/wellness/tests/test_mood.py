# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Mood endpoint tests — parity shapes, upsert, auth."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import User
from wellness.models import Mood

pytestmark = pytest.mark.django_db


@pytest.fixture
def auth_client() -> APIClient:
    user = User.objects.create_user(email="m@forus.app", password="correct-horse-9")
    client = APIClient()
    client.force_authenticate(user=user)
    client.user = user
    return client


def test_get_requires_date(auth_client):
    resp = auth_client.get("/api/mood")
    assert resp.status_code == 400
    assert resp.data["message"] == "Date is required"


def test_get_missing_mood_is_404(auth_client):
    resp = auth_client.get("/api/mood", {"date": "2026-08-01"})
    assert resp.status_code == 404
    assert resp.data["message"] == "No mood set for this date"


def test_set_then_get_and_upsert(auth_client):
    assert auth_client.post("/api/mood", {"date": "2026-08-01", "mood": 4}, format="json").data == {"success": True}
    assert auth_client.get("/api/mood", {"date": "2026-08-01"}).data == {"mood": 4}
    # Same date again updates in place (unique per user+date).
    auth_client.post("/api/mood", {"date": "2026-08-01", "mood": 2}, format="json")
    assert auth_client.get("/api/mood", {"date": "2026-08-01"}).data == {"mood": 2}
    assert Mood.objects.filter(user=auth_client.user, mood_date="2026-08-01").count() == 1


def test_set_invalid_is_400(auth_client):
    resp = auth_client.post("/api/mood", {"date": "2026-08-01", "mood": "high"}, format="json")
    assert resp.status_code == 400
    assert resp.data["message"] == "Date and mood (number) are required"


def test_requires_auth():
    assert APIClient().get("/api/mood", {"date": "2026-08-01"}).status_code == 401
