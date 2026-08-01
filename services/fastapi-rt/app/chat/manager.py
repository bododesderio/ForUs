# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Per-worker connection registry + a short-TTL room-membership cache for fan-out."""
from __future__ import annotations

import time


class ConnectionManager:
    """Maps user_id → the set of this worker's live WebSockets for that user."""

    def __init__(self) -> None:
        self.local: dict[str, set] = {}

    def add(self, user_id: str, ws) -> None:
        self.local.setdefault(user_id, set()).add(ws)

    def remove(self, user_id: str, ws) -> None:
        conns = self.local.get(user_id)
        if conns:
            conns.discard(ws)
            if not conns:
                self.local.pop(user_id, None)

    def is_local(self, user_id: str) -> bool:
        return user_id in self.local

    async def send_local(self, user_id: str, payload: dict) -> None:
        for ws in list(self.local.get(user_id, ())):
            try:
                await ws.send_json(payload)
            except Exception:  # pragma: no cover - a dead socket is cleaned up on its own disconnect
                pass


class MembershipCache:
    """Caches room → member ids briefly so high-frequency events (typing) don't hammer the DB."""

    def __init__(self, ttl: float = 10.0) -> None:
        self.ttl = ttl
        self._store: dict[str, tuple[float, list[str]]] = {}

    def get(self, room_id: str) -> list[str] | None:
        entry = self._store.get(room_id)
        if entry and entry[0] > time.monotonic():
            return entry[1]
        return None

    def put(self, room_id: str, ids: list[str]) -> None:
        self._store[room_id] = (time.monotonic() + self.ttl, ids)
