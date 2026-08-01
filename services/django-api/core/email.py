# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Transactional email via Resend (P2). Best-effort like push: a send failure is logged,
never fatal. With no RESEND_API_KEY configured (dev/test) it is a logged no-op, so
flows work without a provider and tests never hit the network.
"""
from __future__ import annotations

import logging

import httpx
from django.conf import settings

logger = logging.getLogger("forus.email")

RESEND_ENDPOINT = "https://api.resend.com/emails"


def send_email(to: str, subject: str, html: str) -> dict | None:
    api_key = getattr(settings, "RESEND_API_KEY", "") or ""
    if not api_key:
        logger.info("email_skipped_no_api_key", extra={"to": to, "subject": subject})
        return None
    try:
        resp = httpx.post(
            RESEND_ENDPOINT,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception:  # delivery is best-effort
        logger.warning("email_send_failed", extra={"to": to})
        return None
