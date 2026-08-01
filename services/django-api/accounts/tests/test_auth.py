# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Auth endpoint tests — parity envelopes, rotation/blacklist, SEC-1, bcrypt compat."""
from __future__ import annotations

import bcrypt
import pytest
from rest_framework.test import APIClient

from accounts.models import ConsultantDetails, Profile, Role, User

pytestmark = pytest.mark.django_db

STRONG = "correct-horse-9"  # passes MinimumLengthValidator


@pytest.fixture
def client() -> APIClient:
    return APIClient()


def _make_user(email="u@forus.app", password=STRONG, role=Role.USER, **extra) -> User:
    user = User.objects.create_user(email=email, password=password, role=role, **extra)
    Profile.objects.create(user=user, username=email.split("@")[0])
    return user


# ─── Registration ───────────────────────────────────────────────────────────────
def test_register_user_creates_account_and_profile(client):
    resp = client.post(
        "/api/auth/register-user",
        {"username": "ann", "email": "Ann@Forus.app", "password": STRONG},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["success"] is True
    assert resp.data["user"]["role"] == "user"
    assert "accessToken" not in resp.data  # parity: register does not auto-login
    user = User.objects.get(email="ann@forus.app")  # normalized lower-case
    assert Profile.objects.filter(user=user, username="ann").exists()


def test_register_duplicate_email_is_400(client):
    _make_user(email="dupe@forus.app")
    resp = client.post(
        "/api/auth/register-user",
        {"username": "x", "email": "dupe@forus.app", "password": STRONG},
        format="json",
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "Email already exists"


def test_register_weak_password_is_400(client):
    resp = client.post(
        "/api/auth/register-user",
        {"username": "x", "email": "weak@forus.app", "password": "123"},
        format="json",
    )
    assert resp.status_code == 400
    assert resp.data["success"] is False


def test_register_consultant_returns_200_and_details_row(client):
    resp = client.post(
        "/api/auth/register-consultant",
        {"username": "doc", "first_name": "Dee", "last_name": "Oc", "email": "doc@forus.app", "password": STRONG},
        format="json",
    )
    assert resp.status_code == 200
    user = User.objects.get(email="doc@forus.app")
    assert user.role == "consultant"
    assert ConsultantDetails.objects.filter(user=user).exists()


# ─── Login ──────────────────────────────────────────────────────────────────────
def test_login_success_returns_tokens_and_user(client):
    _make_user(email="log@forus.app")
    resp = client.post(
        "/api/auth/login-user", {"email": "log@forus.app", "password": STRONG}, format="json"
    )
    assert resp.status_code == 200
    assert resp.data["success"] is True
    assert resp.data["message"] == "Login Successful"
    assert resp.data["accessToken"] and resp.data["refreshToken"]
    assert resp.data["user"]["email"] == "log@forus.app"


def test_login_token_authenticates_a_protected_route(client):
    _make_user(email="prot@forus.app")
    token = client.post(
        "/api/auth/login-user", {"email": "prot@forus.app", "password": STRONG}, format="json"
    ).data["accessToken"]
    # No creds → 401; with the minted token → not 401 (auth accepted).
    assert client.post("/api/auth/change-password", {}, format="json").status_code == 401
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert client.post("/api/auth/change-password", {}, format="json").status_code != 401


@pytest.mark.parametrize(
    "setup,email,password,message",
    [
        (lambda: None, "ghost@forus.app", STRONG, "User does not exist."),
        (lambda: _make_user(email="bad@forus.app"), "bad@forus.app", "wrong-password-9", "Invalid credentials."),
        (lambda: _make_user(email="off@forus.app", is_active=False), "off@forus.app", STRONG, "Account is deactivated."),
    ],
)
def test_login_failures_are_400_with_parity_messages(client, setup, email, password, message):
    setup()
    resp = client.post("/api/auth/login-user", {"email": email, "password": password}, format="json")
    assert resp.status_code == 400
    assert resp.data["message"] == message


# ─── Refresh rotation + blacklist (SEC-3) ────────────────────────────────────────
def test_refresh_rotates_and_old_token_is_rejected(client):
    _make_user(email="rot@forus.app")
    login = client.post(
        "/api/auth/login-user", {"email": "rot@forus.app", "password": STRONG}, format="json"
    ).data
    old_refresh = login["refreshToken"]

    first = client.post("/api/auth/refresh-token", {"refreshToken": old_refresh}, format="json")
    assert first.status_code == 200
    assert first.data["accessToken"] and first.data["refreshToken"] != old_refresh

    # Replay of the rotated token → rejected (reuse detection).
    replay = client.post("/api/auth/refresh-token", {"refreshToken": old_refresh}, format="json")
    assert replay.status_code == 403


def test_logout_blacklists_refresh_token(client):
    _make_user(email="out@forus.app")
    refresh = client.post(
        "/api/auth/login-user", {"email": "out@forus.app", "password": STRONG}, format="json"
    ).data["refreshToken"]
    assert client.post("/api/auth/logout", {"refreshToken": refresh}, format="json").status_code == 200
    # A blacklisted token can no longer refresh.
    assert client.post("/api/auth/refresh-token", {"refreshToken": refresh}, format="json").status_code == 403


# ─── Change password ─────────────────────────────────────────────────────────────
def test_change_password_flow(client):
    user = _make_user(email="cp@forus.app")
    token = client.post(
        "/api/auth/login-user", {"email": "cp@forus.app", "password": STRONG}, format="json"
    ).data["accessToken"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    wrong = client.post(
        "/api/auth/change-password",
        {"currentPassword": "nope-nope-9", "newPassword": "brand-new-9"},
        format="json",
    )
    assert wrong.status_code == 400
    assert wrong.data["message"] == "Current password is incorrect."

    ok = client.post(
        "/api/auth/change-password",
        {"currentPassword": STRONG, "newPassword": "brand-new-9"},
        format="json",
    )
    assert ok.status_code == 200
    user.refresh_from_db()
    assert user.check_password("brand-new-9")


# ─── Push token (SEC-1: identity from token, not body) ───────────────────────────
def test_push_token_requires_auth_and_binds_to_request_user(client):
    _make_user(email="p1@forus.app")
    victim = _make_user(email="victim@forus.app")

    assert client.post("/api/auth/push-token", {"pushToken": "x"}, format="json").status_code == 401

    token = client.post(
        "/api/auth/login-user", {"email": "p1@forus.app", "password": STRONG}, format="json"
    ).data["accessToken"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = client.post("/api/auth/push-token", {"pushToken": "ExpoTok123"}, format="json")
    assert resp.status_code == 200
    # Saved on the caller's profile only — the victim is untouched (no authId in body).
    assert Profile.objects.get(user__email="p1@forus.app").push_token == "ExpoTok123"
    assert Profile.objects.get(user=victim).push_token is None


# ─── bcrypt / bcryptjs hash compatibility (R2) ───────────────────────────────────
def test_django_reads_bcryptjs_style_hash():
    raw = bcrypt.hashpw(b"nodeSecret9", bcrypt.gensalt())  # same format bcryptjs emits
    user = User.objects.create(email="node@forus.app", role=Role.USER)
    user.password = f"bcrypt${raw.decode()}"  # Django's algorithm marker for a bare bcrypt hash
    user.save(update_fields=["password"])
    user.refresh_from_db()
    assert user.check_password("nodeSecret9") is True
