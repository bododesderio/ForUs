# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""User-domain tests — profile, lists (admin gate), deletes, push tokens, notifications."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import ConsultantDetails, Profile, Role, User
from content.models import Notification

pytestmark = pytest.mark.django_db

PW = "correct-horse-9"


def make(email, role=Role.USER, **profile):
    u = User.objects.create_user(email=email, password=PW, role=role)
    Profile.objects.create(user=u, username=email.split("@")[0], **profile)
    if role == Role.CONSULTANT:
        ConsultantDetails.objects.create(user=u, profession="Therapist", rating=4.5)
    return u


def client_for(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


# ─── Profile ─────────────────────────────────────────────────────────────────────
def test_profile_includes_consultant_fields():
    consultant = make("c@forus.app", Role.CONSULTANT, first_name="Dee", last_name="Oc")
    resp = client_for(consultant).get("/api/users/profile")
    assert resp.status_code == 200
    assert resp.data["user"]["profession"] == "Therapist"
    assert resp.data["user"]["is_approved"] is False


def test_update_profile_requires_a_field_and_updates():
    user = make("u@forus.app")
    c = client_for(user)
    assert c.patch("/api/users/update-profile", {}, format="json").status_code == 400
    resp = c.patch("/api/users/update-profile", {"first_name": "New", "email": "new@forus.app"}, format="json")
    assert resp.status_code == 200
    assert resp.data["user"]["first_name"] == "New"
    user.refresh_from_db()
    assert user.email == "new@forus.app"


# ─── Details ─────────────────────────────────────────────────────────────────────
def test_user_and_consultant_detail_not_found():
    viewer = make("v@forus.app")
    c = client_for(viewer)
    missing = "00000000-0000-0000-0000-000000000000"
    assert c.get(f"/api/users/user/{missing}").status_code == 400
    assert c.get(f"/api/users/consultant/{missing}").status_code == 400
    # A plain user is not a consultant.
    assert c.get(f"/api/users/consultant/{viewer.id}").status_code == 400


# ─── Lists ───────────────────────────────────────────────────────────────────────
def test_consultants_list_filter_and_envelope():
    make("c1@forus.app", Role.CONSULTANT, first_name="Ann")
    make("c2@forus.app", Role.CONSULTANT, first_name="Bob")
    resp = client_for(make("u@forus.app")).get("/api/users/consultants", {"search": "Ann"})
    assert resp.status_code == 200
    assert resp.data["pagination"]["total"] == 1
    assert resp.data["consultants"][0]["first_name"] == "Ann"


def test_users_list_is_admin_only():
    make("a@forus.app")
    make("b@forus.app")
    assert client_for(make("plain@forus.app")).get("/api/users/users").status_code == 403
    admin = make("admin@forus.app", Role.ADMIN)
    resp = client_for(admin).get("/api/users/users")
    assert resp.status_code == 200
    assert resp.data["pagination"]["total"] >= 3


# ─── Delete (admin) ──────────────────────────────────────────────────────────────
def test_delete_user_admin_only_and_soft():
    victim = make("victim@forus.app")
    assert client_for(make("nonadmin@forus.app")).delete(f"/api/users/delete/user/{victim.id}").status_code == 403
    admin = make("admin@forus.app", Role.ADMIN)
    assert client_for(admin).delete(f"/api/users/delete/user/{victim.id}").status_code == 200
    victim.refresh_from_db()
    assert victim.deleted_at is not None and victim.is_active is False
    # Already gone → 400.
    assert client_for(admin).delete(f"/api/users/delete/user/{victim.id}").status_code == 400


# ─── Push tokens ─────────────────────────────────────────────────────────────────
def test_push_token_saves_to_own_profile():
    user = make("p@forus.app")
    c = client_for(user)
    assert c.post("/api/users/push-token", {}, format="json").status_code == 400
    ok = c.post("/api/users/push-token", {"pushToken": "ExpoTok"}, format="json")
    assert ok.status_code == 200 and ok.data["message"] == "Push token saved"
    assert Profile.objects.get(user=user).push_token == "ExpoTok"


# ─── Send notification (admin) ───────────────────────────────────────────────────
def test_send_notification_admin_only_and_persists():
    target = make("t@forus.app")
    assert client_for(make("u@forus.app")).post(
        "/api/users/send-notification", {"userId": str(target.id), "title": "Hi", "body": "yo"}, format="json"
    ).status_code == 403
    admin = make("admin@forus.app", Role.ADMIN)
    resp = client_for(admin).post(
        "/api/users/send-notification", {"userId": str(target.id), "title": "Hi", "body": "yo"}, format="json"
    )
    assert resp.status_code == 200
    assert Notification.objects.filter(recipient=target, title="Hi").exists()


# ─── Notifications ───────────────────────────────────────────────────────────────
def test_notifications_list_and_mark_read_ownership():
    me = make("me@forus.app")
    other = make("other@forus.app")
    mine = Notification.objects.create(recipient=me, title="m", body="b")
    theirs = Notification.objects.create(recipient=other, title="t", body="b")

    c = client_for(me)
    listed = c.get("/api/users/notifications")
    assert listed.status_code == 200
    assert [n["id"] for n in listed.data["notifications"]] == [str(mine.id)]

    # Marking someone else's notification is a no-op (ownership scoped).
    c.post("/api/users/notification/read", {"notificationId": str(theirs.id)}, format="json")
    theirs.refresh_from_db()
    assert theirs.is_read is False

    c.post("/api/users/notification/read", {"notificationId": str(mine.id)}, format="json")
    mine.refresh_from_db()
    assert mine.is_read is True


def test_notification_preference_toggle():
    user = make("pref@forus.app")
    resp = client_for(user).patch("/api/users/notification-preference", {"enabled": False}, format="json")
    assert resp.status_code == 200
    assert Profile.objects.get(user=user).notifications_enabled is False
