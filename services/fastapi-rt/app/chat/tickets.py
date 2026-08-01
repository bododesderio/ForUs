# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""WS ticket consumption (SEC-4). Single-use: GETDEL spends the ticket atomically."""
from __future__ import annotations

TICKET_PREFIX = "ws:ticket:"


async def consume_ticket(redis, ticket: str | None) -> str | None:
    """Return the ticket's user id and burn it, or None if missing/expired/already used."""
    if not ticket:
        return None
    raw = await redis.getdel(f"{TICKET_PREFIX}{ticket}")
    if raw is None:
        return None
    return raw.decode() if isinstance(raw, (bytes, bytearray)) else str(raw)
