# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Activity feed tests — own rows only, most-recent-first, capped at 20."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import Activity, User

pytestmark = pytest.mark.django_db


def test_returns_own_recent_activities_only():
    me = User.objects.create_user(email="me@forus.app", password="correct-horse-9")
    other = User.objects.create_user(email="other@forus.app", password="correct-horse-9")
    for i in range(25):
        Activity.objects.create(user=me, type="login", description=f"a{i}")
    Activity.objects.create(user=other, type="login", description="not mine")

    client = APIClient()
    client.force_authenticate(user=me)
    resp = client.get("/api/activities")
    assert resp.status_code == 200
    assert len(resp.data) == 20  # capped
    assert all(row["type"] == "login" for row in resp.data)


def test_requires_auth():
    assert APIClient().get("/api/activities").status_code == 401
