# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
FastAPI realtime tier entry point.

R0 ships the app skeleton + health probe. The WS chat layer (Redis pub/sub fan-out,
SEC-2/SEC-4/BUG-7/PERF-3..5), Agora video-token issuer, and Pesapal IPN land in R4/R5.
Gateway routes /rt/** and /ws/** here.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .db import check_database, check_redis, make_engine, make_redis


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = make_engine()
    app.state.redis = make_redis()
    try:
        yield
    finally:
        await app.state.engine.dispose()
        await app.state.redis.aclose()


app = FastAPI(title="ForUs Realtime", version="0.1.0", lifespan=lifespan)


@app.get("/rt/health")
async def health() -> JSONResponse:
    db_ok = await check_database(app.state.engine)
    redis_ok = await check_redis(app.state.redis)
    healthy = db_ok and redis_ok
    return JSONResponse(
        {
            "service": "fastapi-rt",
            "status": "ok" if healthy else "degraded",
            "database": "ok" if db_ok else "down",
            "redis": "ok" if redis_ok else "down",
        },
        status_code=200 if healthy else 503,
    )
