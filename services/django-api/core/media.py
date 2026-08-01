# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Media upload hardening (SEC-6).

The client mimetype is never trusted: the real type is sniffed from the file's magic
bytes and must be an allowed media type, so a `.exe` renamed `.png` is rejected. The
oversize check happens before the object is streamed to R2 (Django spools large uploads
to a temp file — never a 50 MB in-memory buffer like the Node `multer.memoryStorage`).
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.core.files.storage import default_storage

# Sniffed content-type → canonical extension. The stored key uses this, not the
# client-supplied filename, so a spoofed extension can't ride along.
ALLOWED_TYPES: dict[str, str] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
}

DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024


def max_upload_bytes() -> int:
    return int(getattr(settings, "MAX_UPLOAD_BYTES", DEFAULT_MAX_UPLOAD_BYTES))


def sniff_content_type(head: bytes) -> str | None:
    """Detect an allowed media type from leading bytes, or None if unrecognized."""
    if head[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if head[:4] == b"GIF8":
        return "image/gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "audio/wav"
    if head[:4] == b"%PDF":
        return "application/pdf"
    if head[4:8] == b"ftyp":
        return "video/mp4"
    if head[:3] == b"ID3" or head[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio/mpeg"
    return None


def store(file_obj, content_type: str) -> str:
    """Stream the upload to R2 under a random key; return its public URL."""
    key = f"{uuid.uuid4().hex}.{ALLOWED_TYPES[content_type]}"
    file_obj.content_type = content_type  # force the sniffed type on the stored object
    saved = default_storage.save(key, file_obj)
    base = (getattr(settings, "R2_PUBLIC_URL", "") or "").rstrip("/")
    return f"{base}/{saved}" if base else default_storage.url(saved)
