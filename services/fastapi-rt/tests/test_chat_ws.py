# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""WS auth gate (SEC-4) and — when a migrated DB + redis are reachable — the repo layer."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app


def test_ws_rejects_connection_without_ticket():
    with TestClient(app) as client, pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws") as ws:  # no ?ticket → closed at 4001
            ws.receive_json()


async def _infra():
    """Skip unless the compose Postgres (with R1 schema) and redis are reachable."""
    from libs.db import tables
    from sqlalchemy import text

    from app.db import make_engine, make_redis

    engine, redis = make_engine(), make_redis()
    try:
        await tables.reflect(engine)
        tables.table("chat_messages")
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await redis.ping()
    except Exception:
        await engine.dispose()
        await redis.aclose()
        pytest.skip("migrated compose DB + redis not available")
    return engine, redis


def _user_values(email):
    now = datetime.now(UTC)
    return {
        "id": uuid.uuid4(),
        "password": "!",
        "is_superuser": False,
        "email": email,
        "role": "user",
        "is_active": True,
        "is_staff": False,
        "email_verified": False,
        "created_at": now,
        "updated_at": now,
    }


async def test_repo_membership_and_persist_then_history():
    from libs.db import tables
    from sqlalchemy import insert

    from app.chat import repo

    engine, redis = await _infra()
    users, rooms, members = (tables.table("users"), tables.table("chat_rooms"), tables.table("chat_members"))
    now = datetime.now(UTC)
    member = _user_values(f"m-{uuid.uuid4().hex[:8]}@forus.app")
    outsider = _user_values(f"o-{uuid.uuid4().hex[:8]}@forus.app")
    room_id = uuid.uuid4()
    try:
        async with engine.connect() as conn:
            trans = await conn.begin()
            await conn.execute(insert(users).values(**member))
            await conn.execute(insert(users).values(**outsider))
            await conn.execute(
                insert(rooms).values(id=room_id, name="t", type="messaging", created_at=now, updated_at=now)
            )
            await conn.execute(
                insert(members).values(id=uuid.uuid4(), room_id=room_id, user_id=member["id"], role="owner", joined_at=now)
            )

            # SEC-2: membership is authoritative.
            assert await repo.is_member(conn, room_id, member["id"]) is True
            assert await repo.is_member(conn, room_id, outsider["id"]) is False

            # BUG-7: the message is persisted, then history returns it (author profile joined).
            msg = await repo.persist_message(conn, room_id, member["id"], "hello", [], None)
            history = await repo.fetch_history(conn, room_id)
            assert any(m["id"] == msg["id"] and m["text"] == "hello" for m in history)
            assert "username" in history[0]

            await trans.rollback()  # leave no residue
    finally:
        await engine.dispose()
        await redis.aclose()
