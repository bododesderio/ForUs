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


def exception_handler(exc: Exception, context: dict) -> Response:
    response = drf_exception_handler(exc, context)
    if response is not None:
        return response

    # Non-DRF exception → log with detail, return a generic body.
    logger.exception("unhandled_api_exception", exc_info=exc)
    detail = str(exc) if settings.DEBUG else "Something went wrong"
    return Response({"success": False, "message": detail}, status=500)
