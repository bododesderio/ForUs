# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Chat DB access for the realtime tier via SQLAlchemy Core over the Django-owned tables
(reflected in libs.db). This tier writes DML (messages) but never DDL (ARCH-1).
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from libs.db import tables
from sqlalchemy import insert, select, update


def _uid(value) -> uuid.UUID:
    return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))


def _now() -> datetime:
    return datetime.now(UTC)


async def is_member(conn, room_id, user_id) -> bool:
    m = tables.table("chat_members")
    res = await conn.execute(
        select(m.c.id).where(m.c.room_id == _uid(room_id), m.c.user_id == _uid(user_id)).limit(1)
    )
    return res.first() is not None


async def member_ids(conn, room_id) -> list[str]:
    m = tables.table("chat_members")
    res = await conn.execute(select(m.c.user_id).where(m.c.room_id == _uid(room_id)))
    return [str(row[0]) for row in res.fetchall()]


async def persist_message(conn, room_id, user_id, text, attachments, parent_id) -> dict:
    msgs = tables.table("chat_messages")
    mid = uuid.uuid4()
    now = _now()
    await conn.execute(
        insert(msgs).values(
            id=mid,
            room_id=_uid(room_id),
            user_id=_uid(user_id),
            text=text,
            attachments=attachments or [],
            mentioned_users=[],
            parent_id=_uid(parent_id) if parent_id else None,
            reaction_counts={},
            reply_count=0,
            created_at=now,
            updated_at=now,
        )
    )
    return {
        "id": str(mid),
        "room_id": str(room_id),
        "user_id": str(user_id),
        "text": text,
        "attachments": attachments or [],
        "parent_id": str(parent_id) if parent_id else None,
        "created_at": now.isoformat(),
    }


async def touch_room(conn, room_id) -> None:
    rooms = tables.table("chat_rooms")
    await conn.execute(update(rooms).where(rooms.c.id == _uid(room_id)).values(updated_at=_now()))


async def fetch_history(conn, room_id, limit: int = 50) -> list[dict]:
    msgs = tables.table("chat_messages")
    profiles = tables.table("profiles")
    res = await conn.execute(
        select(
            msgs,
            profiles.c.username,
            profiles.c.first_name,
            profiles.c.last_name,
            profiles.c.profile_image,
        )
        .select_from(msgs.outerjoin(profiles, profiles.c.user_id == msgs.c.user_id))
        .where(msgs.c.room_id == _uid(room_id), msgs.c.deleted_at.is_(None))
        .order_by(msgs.c.created_at.desc())
        .limit(limit)
    )
    rows = []
    for row in res.fetchall():
        d = dict(row._mapping)
        for key in ("id", "room_id", "user_id", "parent_id"):
            if d.get(key) is not None:
                d[key] = str(d[key])
        for key in ("created_at", "updated_at", "deleted_at"):
            if d.get(key) is not None:
                d[key] = d[key].isoformat()
        rows.append(d)
    rows.reverse()  # oldest-first for the client
    return rows
