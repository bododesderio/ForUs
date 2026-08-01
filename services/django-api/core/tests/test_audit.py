# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Audit-log tests (P9) — sensitive actions are recorded; the trail is admin-only."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import Profile, Role, User
from core.audit import record_audit
from core.models import AuditLog

pytestmark = pytest.mark.django_db


def _user(email, role=Role.USER):
    u = User.objects.create_user(email=email, password="correct-horse-9", role=role)
    Profile.objects.create(user=u, username=email.split("@")[0])
    return u


def _client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_admin_user_delete_is_audited():
    admin, victim = _user("admin@forus.app", Role.ADMIN), _user("victim@forus.app")
    resp = _client(admin).delete(f"/api/users/delete/user/{victim.id}")
    assert resp.status_code == 200
    entry = AuditLog.objects.get(action="user.delete")
    assert str(entry.actor_id) == str(admin.id)
    assert entry.target_type == "User" and entry.target_id == str(victim.id)


def test_admin_event_create_is_audited():
    admin = _user("admin@forus.app", Role.ADMIN)
    _client(admin).post(
        "/api/events/create", {"title": "T", "event_date": "2026-09-01T10:00:00Z"}, format="json"
    )
    assert AuditLog.objects.filter(action="event.create", actor=admin).exists()


def test_audit_log_endpoint_admin_only_paginated_and_filterable():
    admin = _user("admin@forus.app", Role.ADMIN)
    record_audit(admin, "event.create", target_type="Event", target_id="e1")
    record_audit(admin, "user.delete", target_type="User", target_id="u1")

    # Non-admin is refused the trail.
    assert _client(_user("plain@forus.app")).get("/api/audit-log").status_code == 403
    assert APIClient().get("/api/audit-log").status_code == 401

    resp = _client(admin).get("/api/audit-log")
    assert resp.status_code == 200
    assert resp.data["pagination"]["total"] >= 2
    assert set(resp.data["logs"][0]) == {
        "id", "action", "actor", "target_type", "target_id", "metadata", "ip_address", "created_at"
    }
    filtered = _client(admin).get("/api/audit-log", {"action": "user.delete"})
    assert all(row["action"] == "user.delete" for row in filtered.data["logs"])


def test_record_audit_system_actor_is_null():
    record_audit(None, "system.cleanup", target_type="Job")
    assert AuditLog.objects.get(action="system.cleanup").actor_id is None
