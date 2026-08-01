# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Realtime chat WebSocket at /ws.

- Auth: single-use ticket in the handshake query (SEC-4) — no bearer token in the URL.
- send_message: persist first, then broadcast (BUG-7) — a delivered message is always
  in history; a failed insert is never broadcast.
- Fan-out: events publish to a Redis channel so members connected to *other* workers
  receive them too (PERF-3..6) — not the Node in-process Map.
- Membership is checked on send AND on join_room history (SEC-2).
"""
from __future__ import annotations

import json
import logging

from sqlalchemy.exc import SQLAlchemyError
from starlette.websockets import WebSocket, WebSocketDisconnect

from . import repo
from .tickets import consume_ticket

logger = logging.getLogger("forus.rt.chat")

CHANNEL = "chat:events"


async def publish(redis, room_id, payload: dict, exclude: str | None = None) -> None:
    await redis.publish(CHANNEL, json.dumps({"room_id": str(room_id), "payload": payload, "exclude": exclude}))


async def _deliver(app, room_id: str, payload: dict, exclude: str | None) -> None:
    """Deliver a broadcast to this worker's connections that are members of the room."""
    manager = app.state.chat_manager
    cache = app.state.chat_members_cache
    ids = cache.get(room_id)
    if ids is None:
        async with app.state.engine.connect() as conn:
            ids = await repo.member_ids(conn, room_id)
        cache.put(room_id, ids)
    for uid in ids:
        if exclude and uid == exclude:
            continue
        if manager.is_local(uid):
            await manager.send_local(uid, payload)


async def pubsub_listener(app) -> None:
    """Background task: fan every published event out to local members. Started at boot."""
    pubsub = app.state.redis.pubsub()
    await pubsub.subscribe(CHANNEL)
    app.state.chat_pubsub = pubsub
    try:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            try:
                data = json.loads(message["data"])
                await _deliver(app, data["room_id"], data["payload"], data.get("exclude"))
            except Exception:  # pragma: no cover - one bad event must not kill the listener
                logger.warning("chat_pubsub_deliver_failed")
    except Exception:  # pragma: no cover - subscription lost (e.g. redis down); listener exits
        logger.warning("chat_pubsub_listener_stopped")


async def _handle(app, uid: str, ws: WebSocket, event: dict) -> None:
    engine, redis = app.state.engine, app.state.redis
    etype = event.get("type")

    if etype == "send_message":
        room_id, text = event.get("roomId"), (event.get("text") or "").strip()
        if not room_id or not text:
            return
        # Persist-then-broadcast (BUG-7): commit inside the transaction, publish only after.
        async with engine.begin() as conn:
            if not await repo.is_member(conn, room_id, uid):
                await ws.send_json({"type": "error", "message": "Not a member of this room"})
                return
            try:
                message = await repo.persist_message(
                    conn, room_id, uid, text, event.get("attachments"), event.get("parentId")
                )
                await repo.touch_room(conn, room_id)
            except SQLAlchemyError:
                await ws.send_json({"type": "error", "message": "Failed to send message"})
                return
        await publish(redis, room_id, {"type": "new_message", "message": message})

    elif etype == "typing":
        room_id = event.get("roomId")
        if room_id:
            await publish(redis, room_id, {"type": "typing", "userId": uid, "roomId": room_id}, exclude=uid)

    elif etype == "read_receipt":
        room_id = event.get("roomId")
        if room_id:
            await publish(
                redis,
                room_id,
                {"type": "read_receipt", "userId": uid, "messageId": event.get("messageId"), "roomId": room_id},
                exclude=uid,
            )

    elif etype == "join_room":
        room_id = event.get("roomId")
        if not room_id:
            return
        async with engine.connect() as conn:
            if not await repo.is_member(conn, room_id, uid):  # SEC-2 — the Node join_room lacked this
                await ws.send_json({"type": "error", "message": "Not a member of this room"})
                return
            history = await repo.fetch_history(conn, room_id)
        await ws.send_json({"type": "room_history", "roomId": room_id, "messages": history})


async def chat_ws(websocket: WebSocket) -> None:
    app = websocket.app
    uid = await consume_ticket(app.state.redis, websocket.query_params.get("ticket"))
    if not uid:
        await websocket.close(code=4001)  # authentication required / ticket spent
        return
    await websocket.accept()
    manager = app.state.chat_manager
    manager.add(uid, websocket)
    await websocket.send_json({"type": "connected", "userId": uid})
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid payload"})
                continue
            await _handle(app, uid, websocket, event)
    except WebSocketDisconnect:
        pass
    except Exception:  # pragma: no cover - defensive: never leak a live connection on error
        logger.warning("chat_ws_error", extra={"user_id": uid})
    finally:
        manager.remove(uid, websocket)
