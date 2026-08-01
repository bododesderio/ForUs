# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Upload endpoint tests (SEC-6) — content sniffing, size cap, auth. R2 stubbed in-memory."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

from accounts.models import Profile, User
from core.media import sniff_content_type

pytestmark = pytest.mark.django_db

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 24
EXE = b"MZ\x90\x00" + b"\x00" * 24  # DOS/PE header — not an allowed media type

MEMORY_STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}


def _client():
    user = User.objects.create_user(email="up@forus.app", password="correct-horse-9")
    Profile.objects.create(user=user, username="up")
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_sniff_detects_and_rejects():
    assert sniff_content_type(PNG) == "image/png"
    assert sniff_content_type(b"%PDF-1.7") == "application/pdf"
    assert sniff_content_type(EXE) is None


@override_settings(STORAGES=MEMORY_STORAGES, R2_PUBLIC_URL="https://cdn.forus.app")
def test_valid_image_uploads_and_returns_public_url():
    resp = _client().post(
        "/api/upload", {"file": SimpleUploadedFile("pic.png", PNG, content_type="image/png")}, format="multipart"
    )
    assert resp.status_code == 200
    assert resp.data["success"] is True
    assert resp.data["url"].startswith("https://cdn.forus.app/")
    assert resp.data["url"].endswith(".png")


@override_settings(STORAGES=MEMORY_STORAGES)
def test_spoofed_extension_is_rejected_on_content_sniff():
    # A .exe renamed .png must be rejected (client mimetype is never trusted).
    resp = _client().post(
        "/api/upload", {"file": SimpleUploadedFile("evil.png", EXE, content_type="image/png")}, format="multipart"
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "File type not allowed"


def test_no_file_is_400():
    resp = _client().post("/api/upload", {}, format="multipart")
    assert resp.status_code == 400
    assert resp.data["message"] == "No file provided"


@override_settings(STORAGES=MEMORY_STORAGES, MAX_UPLOAD_BYTES=10)
def test_oversize_is_rejected_before_storage():
    resp = _client().post(
        "/api/upload", {"file": SimpleUploadedFile("big.png", PNG, content_type="image/png")}, format="multipart"
    )
    assert resp.status_code == 400
    assert resp.data["message"] == "File exceeds the maximum allowed size"


def test_upload_requires_auth():
    resp = APIClient().post(
        "/api/upload", {"file": SimpleUploadedFile("pic.png", PNG, content_type="image/png")}, format="multipart"
    )
    assert resp.status_code == 401
