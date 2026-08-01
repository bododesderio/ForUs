/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { v4 as uuid } from 'uuid';

export const createChatRoom = async (req, res) => {
    try {
        const { roomId: customRoomId, name, type = 'messaging', members = [] } = req.body;
        const createdBy = req.user.id;
        const roomId = customRoomId || uuid();

        // Create room if it doesn't exist
        await pool.query(
            `INSERT INTO chat_rooms (id, name, type, created_by) VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING`,
            [roomId, name || roomId, type, createdBy]
        );

        // Add creator as owner
        await pool.query(
            `INSERT INTO chat_members (room_id, user_id, role) VALUES ($1, $2, $3)
             ON CONFLICT (room_id, user_id) DO NOTHING`,
            [roomId, createdBy, 'owner']
        );

        // Add other members
        for (const member of members) {
            await pool.query(
                `INSERT INTO chat_members (room_id, user_id, role) VALUES ($1, $2, $3)
                 ON CONFLICT (room_id, user_id) DO NOTHING`,
                [roomId, member.user_id, member.role || 'member']
            );
        }

        res.json({ success: true, room_id: roomId, message: 'Chat room created successfully' });
    } catch (error) {
        logger.error({ error }, 'createChatRoom failed');
        res.status(500).json({ success: false, message: 'Failed to create chat room' });
    }
};

export const getUserRooms = async (req, res) => {
    try {
        const { rows: rooms } = await pool.query(
            `SELECT cr.id, cr.name, cr.type, cr.updated_at, cm.role, cm.joined_at,
                (SELECT text FROM chat_messages WHERE room_id = cr.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM chat_messages WHERE room_id = cr.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message_at
             FROM chat_rooms cr
             JOIN chat_members cm ON cr.id = cm.room_id
             WHERE cm.user_id = $1
             ORDER BY cr.updated_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, rooms });
    } catch (error) {
        logger.error({ error }, 'getUserRooms failed');
        res.status(500).json({ success: false, message: 'Failed to get rooms' });
    }
};

export const getRoomMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const before = req.query.before;

        // Verify membership
        const { rows: membership } = await pool.query(
            'SELECT id FROM chat_members WHERE room_id = $1 AND user_id = $2',
            [roomId, req.user.id]
        );
        if (!membership.length) {
            return res.status(403).json({ success: false, message: 'Not a member of this room' });
        }

        let query = `
            SELECT cm.*, p.username, p.first_name, p.last_name, p.profile_image
            FROM chat_messages cm
            LEFT JOIN profiles p ON cm.user_id = p.user_id
            WHERE cm.room_id = $1 AND cm.deleted_at IS NULL
        `;
        const params = [roomId];
        let paramIdx = 2;

        if (before) {
            query += ` AND cm.created_at < $${paramIdx++}`;
            params.push(before);
        }

        query += ` ORDER BY cm.created_at DESC LIMIT $${paramIdx}`;
        params.push(limit);

        const { rows: messages } = await pool.query(query, params);
        res.json({ success: true, messages: messages.reverse() });
    } catch (error) {
        logger.error({ error }, 'getRoomMessages failed');
        res.status(500).json({ success: false, message: 'Failed to get messages' });
    }
};

export const joinRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        await pool.query(
            `INSERT INTO chat_members (room_id, user_id, role) VALUES ($1, $2, $3)
             ON CONFLICT (room_id, user_id) DO NOTHING`,
            [roomId, req.user.id, 'member']
        );
        res.json({ success: true, message: 'Joined room' });
    } catch (error) {
        logger.error({ error }, 'joinRoom failed');
        res.status(500).json({ success: false, message: 'Failed to join room' });
    }
};

// Kept for backward compatibility — webhook no longer needed with native WS
export const handleStreamWebhook = async (_req, res) => {
    res.json({ success: true, message: 'Webhook endpoint deprecated — using native WebSocket' });
};

export const verifyWebhookSignature = (_req, _res, next) => next();
