# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Shared data access for the realtime tier.

FastAPI reads the same PostgreSQL that Django owns, via SQLAlchemy Core (async).
It never runs DDL — Django migrations are the single source of schema truth (ARCH-1).
"""
from __future__ import annotations

import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from .config import settings


def make_engine() -> AsyncEngine:
    return create_async_engine(settings.sqlalchemy_url, pool_pre_ping=True, pool_size=10)


def make_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, socket_connect_timeout=1)


async def check_database(engine: AsyncEngine) -> bool:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:  # pragma: no cover - exercised only when DB is down
        return False


async def check_redis(client: aioredis.Redis) -> bool:
    try:
        return bool(await client.ping())
    except Exception:  # pragma: no cover - exercised only when Redis is down
        return False
