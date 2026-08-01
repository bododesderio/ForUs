# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Liveness/readiness probe. Gateway exposes it at /api/health."""
from __future__ import annotations

import redis
from django.conf import settings
from django.db import connection
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .media import max_upload_bytes, sniff_content_type, store


def _check_database() -> bool:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception:  # pragma: no cover - exercised only when DB is down
        return False


def _check_redis() -> bool:
    try:
        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=1)
        return bool(client.ping())
    except Exception:  # pragma: no cover - exercised only when Redis is down
        return False


class HealthView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def get(self, request) -> Response:
        db_ok = _check_database()
        redis_ok = _check_redis()
        healthy = db_ok and redis_ok
        return Response(
            {
                "service": "django-api",
                "status": "ok" if healthy else "degraded",
                "database": "ok" if db_ok else "down",
                "redis": "ok" if redis_ok else "down",
            },
            status=200 if healthy else 503,
        )


class UploadView(APIView):
    """
    POST /api/upload (multipart, field `file`) → {success, url}. The single media
    upload path to Cloudflare R2. SEC-6: size-capped and content-sniffed.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        upload = request.FILES.get("file")
        if upload is None:
            return self._bad("No file provided")
        if upload.size and upload.size > max_upload_bytes():
            return self._bad("File exceeds the maximum allowed size")
        head = upload.read(16)
        upload.seek(0)
        content_type = sniff_content_type(head)
        if content_type is None:
            return self._bad("File type not allowed")
        url = store(upload, content_type)
        return Response({"success": True, "url": url}, status=status.HTTP_200_OK)

    @staticmethod
    def _bad(message: str) -> Response:
        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)
