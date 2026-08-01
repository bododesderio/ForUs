# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Uniform API error contract (ARCH-2) with prod-safe messages (SEC-7).

Every unhandled exception becomes a JSON response — no handler can complete without
responding (BUG-2), and no stack/driver text crosses the API boundary in production.
"""
from __future__ import annotations

import logging

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def _summarize(data: object) -> str:
    """Pick a human-facing `message` out of a DRF error body (frontend reads `.message`)."""
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        for value in data.values():  # first field error
            if isinstance(value, (list, tuple)) and value:
                return str(value[0])
            if isinstance(value, str):
                return value
    if isinstance(data, (list, tuple)) and data:
        return str(data[0])
    return "Request failed"


def exception_handler(exc: Exception, context: dict) -> Response:
    response = drf_exception_handler(exc, context)
    if response is not None:
        # Normalize every DRF error into the one envelope (ARCH-2): success + message,
        # with the original field errors preserved under `errors` for clients that want them.
        detail = response.data
        response.data = {
            "success": False,
            "message": _summarize(detail),
            "errors": detail,
        }
        return response

    # Non-DRF exception → log with detail, return a generic body.
    logger.exception("unhandled_api_exception", exc_info=exc)
    detail = str(exc) if settings.DEBUG else "Something went wrong"
    return Response({"success": False, "message": detail}, status=500)
