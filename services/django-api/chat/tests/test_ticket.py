# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""WS ticket endpoint (SEC-4) — issues a short-lived single-use ticket into Redis."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import Profile, User
from chat.tickets import TICKET_PREFIX, _redis

pytestmark = pytest.mark.django_db


def test_token_endpoint_issues_ticket_bound_to_user():
    user = User.objects.create_user(email="t@forus.app", password="correct-horse-9")
    Profile.objects.create(user=user, username="t")
    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.get("/api/chat/token")
    assert resp.status_code == 200
    ticket = resp.data["ticket"]
    assert resp.data["ws_path"] == "/ws"

    r = _redis()
    stored = r.get(f"{TICKET_PREFIX}{ticket}")
    assert stored is not None
    assert stored.decode() == str(user.id)
    assert 0 < r.ttl(f"{TICKET_PREFIX}{ticket}") <= 30
    r.delete(f"{TICKET_PREFIX}{ticket}")  # cleanup


def test_token_requires_auth():
    assert APIClient().get("/api/chat/token").status_code == 401
