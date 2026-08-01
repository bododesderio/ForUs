# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
SQLAlchemy Core reflection of the ForUs schema.

Django (services/django-api) owns the DDL via migrations — the single source of
truth (ARCH-1). The realtime tier reads the very same tables through Core `Table`
objects reflected here, so the two services always agree on table shapes without a
second ORM emitting DDL. Nothing in this module ever issues DDL.

Usage (async, from the FastAPI tier):

    from libs.db import tables
    await tables.reflect(engine)          # once, at startup
    users = tables.table("users")         # Core Table, ready for select()
"""
from __future__ import annotations

from sqlalchemy import MetaData, Table
from sqlalchemy.ext.asyncio import AsyncEngine

# The 19 tables Django owns after R1. `refresh_tokens` is intentionally absent —
# its semantics moved to SimpleJWT's token_blacklist app.
FORUS_TABLES: tuple[str, ...] = (
    "users",
    "profiles",
    "consultant_details",
    "admin_details",
    "appointments",
    "reviews",
    "moods",
    "resources",
    "events",
    "notifications",
    "activities",
    "chat_rooms",
    "chat_members",
    "chat_messages",
    "message_reactions",
    "community_posts",
    "community_likes",
    "community_comments",
    "password_reset_tokens",
)

# Shared, process-wide registry. Populated by reflect(); read via table().
metadata = MetaData()


async def reflect(engine: AsyncEngine, *, only: tuple[str, ...] = FORUS_TABLES) -> MetaData:
    """
    Reflect the known tables into the shared MetaData. Idempotent — safe to call
    again (extend_existing) after a migration adds columns. Uses run_sync because
    Core reflection is synchronous under the async engine.
    """
    async with engine.connect() as conn:
        await conn.run_sync(
            lambda sync_conn: metadata.reflect(
                bind=sync_conn, only=list(only), extend_existing=True
            )
        )
    return metadata


def table(name: str) -> Table:
    """Return a previously reflected Table, or raise if reflect() has not run for it."""
    try:
        return metadata.tables[name]
    except KeyError as exc:  # pragma: no cover - guardrail for call-order mistakes
        raise KeyError(
            f"table {name!r} is not reflected yet — call `await reflect(engine)` at startup"
        ) from exc
