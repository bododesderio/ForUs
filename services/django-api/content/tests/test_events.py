# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Event endpoint tests — admin gating (BUG-4), pagination, partial update."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from content.models import Event

pytestmark = pytest.mark.django_db

EVENT = {"title": "Wellness Talk", "event_date": "2026-09-01T10:00:00Z"}


def _client(role=Role.USER) -> APIClient:
    user = User.objects.create_user(email=f"{role}@forus.app", password="correct-horse-9", role=role)
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def test_create_requires_admin_role_403_for_user():
    resp = _client(Role.USER).post("/api/events/create", EVENT, format="json")
    assert resp.status_code == 403  # BUG-4: non-admin is refused, not hung


def test_admin_create_and_missing_title():
    admin = _client(Role.ADMIN)
    ok = admin.post("/api/events/create", EVENT, format="json")
    assert ok.status_code == 200
    assert ok.data["success"] is True and ok.data["id"]

    bad = admin.post("/api/events/create", {"event_date": "2026-09-01T10:00:00Z"}, format="json")
    assert bad.status_code == 400
    assert bad.data["message"] == "Validation errors"


def test_list_pagination_envelope():
    admin = _client(Role.ADMIN)
    for i in range(7):
        admin.post("/api/events/create", {**EVENT, "title": f"E{i}"}, format="json")
    resp = _client(Role.USER).get("/api/events/get", {"page": 1, "limit": 5})
    assert resp.status_code == 200
    assert len(resp.data["events"]) == 5
    assert resp.data["pagination"] == {"page": 1, "limit": 5, "total": 7, "pages": 2}


def test_detail_found_and_missing():
    admin = _client(Role.ADMIN)
    eid = admin.post("/api/events/create", EVENT, format="json").data["id"]
    assert admin.get(f"/api/events/details/{eid}").data["event"]["title"] == "Wellness Talk"
    missing = admin.get("/api/events/details/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 400
    assert missing.data["message"] == "Event not found"


def test_update_is_partial_and_admin_only():
    admin = _client(Role.ADMIN)
    eid = admin.post("/api/events/create", {**EVENT, "location": "Lira"}, format="json").data["id"]

    assert _client(Role.USER).patch(f"/api/events/update/{eid}", {"title": "X"}, format="json").status_code == 403

    resp = admin.patch(f"/api/events/update/{eid}", {"title": "Renamed"}, format="json")
    assert resp.status_code == 200
    assert resp.data["updatedEvent"]["title"] == "Renamed"
    # Partial: omitted `location` is preserved, not nulled.
    assert Event.objects.get(pk=eid).location == "Lira"


def test_delete_admin_only_and_missing():
    admin = _client(Role.ADMIN)
    eid = admin.post("/api/events/create", EVENT, format="json").data["id"]
    assert _client(Role.USER).delete(f"/api/events/delete/{eid}").status_code == 403
    assert admin.delete(f"/api/events/delete/{eid}").status_code == 200
    assert admin.delete(f"/api/events/delete/{eid}").status_code == 400  # already gone
