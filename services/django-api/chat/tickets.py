# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Short-lived, single-use WebSocket tickets (SEC-4).

The client exchanges its bearer token (Authorization header) for a ticket here, then
connects `ws://…/ws?ticket=<t>`. FastAPI consumes the ticket atomically (GETDEL) once,
so a leaked ticket is already spent and expires in seconds — no long-lived token ever
rides in a WS URL or proxy/access log.
"""
from __future__ import annotations

import secrets

import redis
from django.conf import settings

TICKET_TTL_SECONDS = 30
TICKET_PREFIX = "ws:ticket:"

_client: redis.Redis | None = None


def _redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.REDIS_URL)
    return _client


def issue_ticket(user_id) -> str:
    ticket = secrets.token_urlsafe(32)
    _redis().setex(f"{TICKET_PREFIX}{ticket}", TICKET_TTL_SECONDS, str(user_id))
    return ticket
