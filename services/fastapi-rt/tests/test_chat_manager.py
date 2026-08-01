# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Unit tests for the connection registry and membership cache (no infra)."""
from __future__ import annotations

import pytest

from app.chat.manager import ConnectionManager, MembershipCache


class _FakeWS:
    def __init__(self):
        self.sent = []

    async def send_json(self, payload):
        self.sent.append(payload)


def test_manager_add_remove_is_local():
    m = ConnectionManager()
    ws = _FakeWS()
    assert m.is_local("u1") is False
    m.add("u1", ws)
    assert m.is_local("u1") is True
    m.remove("u1", ws)
    assert m.is_local("u1") is False  # empty set is pruned


async def test_manager_send_local_delivers_to_all_sockets():
    m = ConnectionManager()
    a, b = _FakeWS(), _FakeWS()
    m.add("u1", a)
    m.add("u1", b)
    await m.send_local("u1", {"hello": 1})
    assert a.sent == [{"hello": 1}] and b.sent == [{"hello": 1}]
    await m.send_local("nobody", {"x": 1})  # no-op, no error


def test_membership_cache_hit_and_expiry():
    c = MembershipCache(ttl=10.0)
    assert c.get("r1") is None
    c.put("r1", ["a", "b"])
    assert c.get("r1") == ["a", "b"]
    expired = MembershipCache(ttl=-1.0)  # already stale
    expired.put("r2", ["a"])
    assert expired.get("r2") is None


@pytest.mark.parametrize("ticket,expected", [(None, None), ("", None)])
async def test_consume_ticket_short_circuits_without_redis(ticket, expected):
    from app.chat.tickets import consume_ticket

    # Falsy ticket returns None without ever calling redis.
    assert await consume_ticket(object(), ticket) is expected
