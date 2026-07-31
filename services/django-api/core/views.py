# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Liveness/readiness probe. Gateway exposes it at /api/health."""
from __future__ import annotations

import redis
from django.conf import settings
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


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
