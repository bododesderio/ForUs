# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Resource endpoint tests — upload validation, public list, soft-delete hiding."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from content.models import Resource

pytestmark = pytest.mark.django_db

RES = {"title": "Calm Audio", "type": "audio", "file_url": "https://r2/calm.mp3", "category": "sleep"}


def _consultant_client() -> tuple[APIClient, User]:
    user = User.objects.create_user(email="c@forus.app", password="correct-horse-9", role=Role.CONSULTANT)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_upload_creates_resource_owned_by_caller():
    client, user = _consultant_client()
    resp = client.post("/api/resources/upload", RES, format="json")
    assert resp.status_code == 201
    assert resp.data["success"] is True
    assert Resource.objects.get(pk=resp.data["id"]).consultant_id == user.id


def test_upload_missing_required_is_400():
    client, _ = _consultant_client()
    resp = client.post("/api/resources/upload", {"title": "x"}, format="json")
    assert resp.status_code == 400
    assert resp.data["message"] == "Title, type, and file_url are required."


def test_upload_requires_auth():
    assert APIClient().post("/api/resources/upload", RES, format="json").status_code == 401


def test_list_is_public_filters_and_hides_deleted():
    client, user = _consultant_client()
    client.post("/api/resources/upload", RES, format="json")
    client.post("/api/resources/upload", {**RES, "title": "Book", "type": "book"}, format="json")
    # Soft-delete one — it must not appear in the public list.
    Resource.objects.filter(type="book").first().delete()

    resp = APIClient().get("/api/resources")  # no auth
    assert resp.status_code == 200
    assert resp.data["success"] is True
    titles = [r["title"] for r in resp.data["resources"]]
    assert titles == ["Calm Audio"]

    filtered = APIClient().get("/api/resources", {"type": "audio"})
    assert len(filtered.data["resources"]) == 1
