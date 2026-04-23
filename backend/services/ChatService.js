import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuid } from 'uuid';

// In-memory connection map: userId -> WebSocket
const connections = new Map();

const send = (ws, payload) => {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(payload));
    }
};

const broadcastToRoom = async (roomId, payload, excludeUserId = null) => {
    try {
        const [members] = await pool.query(
            'SELECT user_id FROM chat_members WHERE room_id = ?',
            [roomId]
        );
        for (const member of members) {
            if (excludeUserId && member.user_id === excludeUserId) continue;
            const ws = connections.get(member.user_id);
            if (ws) send(ws, payload);
        }
    } catch (error) {
        logger.error({ error }, 'broadcastToRoom failed');
    }
};

const persistMessage = async ({ id, roomId, userId, text, attachments, parentId }) => {
    await pool.query(
        `INSERT INTO chat_messages (id, room_id, user_id, text, attachments, parent_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [id, roomId, userId, text, JSON.stringify(attachments || []), parentId || null]
    );
};

export const handleConnection = (ws, req) => {
    // Extract token from query string: ws://host/ws?token=xxx
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
        ws.close(4001, 'Authentication required');
        return;
    }

    let user;
    try {
        user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        ws.close(4001, 'Invalid token');
        return;
    }

    connections.set(user.id, ws);
    logger.info({ userId: user.id }, 'WebSocket connected');

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
        try {
            const event = JSON.parse(raw);

            switch (event.type) {
                case 'send_message': {
                    const { roomId, text, attachments, parentId } = event;
                    if (!roomId || !text?.trim()) return;

                    // Verify user is a member of this room
                    const [membership] = await pool.query(
                        'SELECT id FROM chat_members WHERE room_id = ? AND user_id = ?',
                        [roomId, user.id]
                    );
                    if (!membership.length) {
                        send(ws, { type: 'error', message: 'Not a member of this room' });
                        return;
                    }

                    const messageId = uuid();
                    const message = {
                        id: messageId,
                        roomId,
                        userId: user.id,
                        text: text.trim(),
                        attachments: attachments || [],
                        parentId: parentId || null,
                        createdAt: new Date().toISOString(),
                    };

                    // Broadcast immediately (optimistic)
                    await broadcastToRoom(roomId, { type: 'new_message', message });

                    // Persist async
                    persistMessage(message).catch(err =>
                        logger.error({ err }, 'Failed to persist message')
                    );

                    // Update room updated_at
                    pool.query('UPDATE chat_rooms SET updated_at = NOW() WHERE id = ?', [roomId])
                        .catch(() => {});
                    break;
                }

                case 'typing': {
                    const { roomId } = event;
                    if (!roomId) return;
                    await broadcastToRoom(roomId, {
                        type: 'typing',
                        userId: user.id,
                        roomId,
                    }, user.id);
                    break;
                }

                case 'read_receipt': {
                    const { roomId, messageId } = event;
                    if (!roomId) return;
                    await broadcastToRoom(roomId, {
                        type: 'read_receipt',
                        userId: user.id,
                        messageId,
                        roomId,
                    }, user.id);
                    break;
                }

                case 'join_room': {
                    const { roomId } = event;
                    if (!roomId) return;
                    // Fetch last 50 messages for this room
                    const [messages] = await pool.query(
                        `SELECT cm.*, p.username, p.first_name, p.last_name, p.profile_image
                         FROM chat_messages cm
                         LEFT JOIN profiles p ON cm.user_id = p.user_id
                         WHERE cm.room_id = ? AND cm.deleted_at IS NULL
                         ORDER BY cm.created_at DESC LIMIT 50`,
                        [roomId]
                    );
                    send(ws, { type: 'room_history', roomId, messages: messages.reverse() });
                    break;
                }

                default:
                    logger.warn({ type: event.type }, 'Unknown WebSocket event type');
            }
        } catch (error) {
            logger.error({ error }, 'WebSocket message handler error');
            send(ws, { type: 'error', message: 'Failed to process message' });
        }
    });

    ws.on('close', () => {
        connections.delete(user.id);
        logger.info({ userId: user.id }, 'WebSocket disconnected');
    });

    ws.on('error', (error) => {
        logger.error({ error, userId: user.id }, 'WebSocket error');
        connections.delete(user.id);
    });

    send(ws, { type: 'connected', userId: user.id });
};

// Heartbeat interval — ping all connections every 30s, drop dead ones
export const startHeartbeat = (wss) => {
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) {
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => clearInterval(interval));
};
