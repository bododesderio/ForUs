# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Forgot-password + email-verification tests (P2). Email is stubbed (no network)."""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.core.signing import TimestampSigner
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import PasswordResetToken, Profile, User
from accounts.views import EMAIL_VERIFY_SALT

pytestmark = pytest.mark.django_db
STRONG = "correct-horse-9"


@pytest.fixture(autouse=True)
def _stub_email(monkeypatch):
    sent = []
    monkeypatch.setattr("accounts.views.send_email", lambda to, subject, html: sent.append((to, subject)))
    return sent


def _user(email="u@forus.app"):
    u = User.objects.create_user(email=email, password=STRONG)
    Profile.objects.create(user=u, username="u")
    return u


# ─── Forgot / reset ──────────────────────────────────────────────────────────────
def test_forgot_password_issues_token_and_emails(_stub_email):
    user = _user()
    resp = APIClient().post("/api/auth/forgot-password", {"email": "u@forus.app"}, format="json")
    assert resp.status_code == 200
    assert PasswordResetToken.objects.filter(user=user, used_at__isnull=True).exists()
    assert len(_stub_email) == 1


def test_forgot_password_unknown_email_is_silent(_stub_email):
    resp = APIClient().post("/api/auth/forgot-password", {"email": "ghost@forus.app"}, format="json")
    assert resp.status_code == 200  # no account enumeration
    assert PasswordResetToken.objects.count() == 0
    assert _stub_email == []


def test_reset_password_consumes_token_and_changes_password():
    user = _user()
    prt = PasswordResetToken.objects.create(
        user=user, token="tok-123", expires_at=timezone.now() + timedelta(hours=1)
    )
    resp = APIClient().post(
        "/api/auth/reset-password", {"token": "tok-123", "newPassword": "brand-new-9"}, format="json"
    )
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.check_password("brand-new-9")
    prt.refresh_from_db()
    assert prt.used_at is not None
    # Reuse of a spent token is rejected.
    assert APIClient().post(
        "/api/auth/reset-password", {"token": "tok-123", "newPassword": "another-new-9"}, format="json"
    ).status_code == 400


def test_reset_password_rejects_expired_token():
    user = _user()
    PasswordResetToken.objects.create(
        user=user, token="old", expires_at=timezone.now() - timedelta(minutes=1)
    )
    resp = APIClient().post(
        "/api/auth/reset-password", {"token": "old", "newPassword": "brand-new-9"}, format="json"
    )
    assert resp.status_code == 400


# ─── Email verification ─────────────────────────────────────────────────────────
def test_verify_email_request_requires_auth():
    assert APIClient().post("/api/auth/verify-email/request").status_code == 401


def test_verify_email_confirm_sets_flag():
    user = _user()
    assert user.email_verified is False
    token = TimestampSigner(salt=EMAIL_VERIFY_SALT).sign(str(user.id))
    resp = APIClient().post("/api/auth/verify-email/confirm", {"token": token}, format="json")
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.email_verified is True


def test_verify_email_confirm_rejects_bad_token():
    resp = APIClient().post("/api/auth/verify-email/confirm", {"token": "garbage"}, format="json")
    assert resp.status_code == 400
