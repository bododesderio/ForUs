# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Expo push delivery + the notification helper.

`notify()` is the corrected replacement for the Node reminder path (BUG-5): it persists
exactly one `notifications` row per recipient (never a null `recipient_id`, never a double
save) and best-effort delivers an Expo push when the recipient has a token and opted in.
"""
from __future__ import annotations

import logging

import httpx

logger = logging.getLogger("forus.push")

EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send"


def send_expo_push(push_token: str, title: str, body: str, data: dict | None = None) -> dict:
    """Send one Expo push. Raises on an invalid token or a non-ok Expo response."""
    if not push_token or not str(push_token).startswith("ExponentPushToken"):
        raise ValueError("Invalid Expo push token")
    resp = httpx.post(
        EXPO_ENDPOINT,
        json={"to": push_token, "sound": "default", "title": title, "body": body, "data": data or {}},
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        timeout=10.0,
    )
    result = resp.json()
    ticket = result.get("data")
    if isinstance(ticket, dict) and ticket.get("status") == "ok":
        return result
    message = ticket.get("message") if isinstance(ticket, dict) else "Failed to send notification"
    raise RuntimeError(message)


def notify(user, title: str, body: str, data: dict | None = None) -> None:
    """Persist a notification for `user` and push it if they have a token + opted in."""
    from accounts.models import Profile
    from content.models import Notification

    Notification.objects.create(recipient=user, title=title, body=body, data=data or {})
    profile = Profile.objects.filter(user=user).first()
    if profile and profile.push_token and profile.notifications_enabled:
        try:
            send_expo_push(profile.push_token, title, body, data or {})
        except Exception:  # delivery is best-effort — a push failure must not fail the job
            logger.warning("push_delivery_failed", extra={"user_id": str(user.pk)})
