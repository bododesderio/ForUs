/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { StreamChat } from 'stream-chat';
import { pool } from '../db/index.js';

const serverClient = StreamChat.getInstance(
    process.env.STREAM_API_KEY,
    process.env.STREAM_API_SECRET
);

export class StreamChatService {
    static generateUserToken(userId) {
        return serverClient.createToken(userId.toString());
    }

    static async createOrGetRoom(roomId, roomData, createdBy) {
        // First, ensure the creator exists in Stream Chat
        await this.createOrUpdateStreamUser(createdBy);

        // Check if room exists in DB
        const { rows: existingRoom } = await pool.query('SELECT * FROM chat_rooms WHERE id = $1', [roomId]);
        if (existingRoom.length === 0) {
            await pool.query(
                'INSERT INTO chat_rooms (id, name, type, created_by) VALUES ($1, $2, $3, $4)',
                [roomId, roomData.name, roomData.type || 'messaging', createdBy]
            );
        }

        const channelType = roomData.type || 'messaging';

        const channelData = {
            name: roomData.name,
            created_by_id: createdBy.toString(),
        };

        Object.keys(roomData).forEach(key => {
            if (key !== 'type' && key !== 'name') {
                channelData[key] = roomData[key];
            }
        });

        const channel = serverClient.channel(channelType, roomId, channelData);
        await channel.create();
        return channel;
    }

    static async createOrUpdateStreamUser(userId, userType = 'user') {
        try {
            // All users are in the unified users + profiles tables
            const { rows: userRows } = await pool.query(
                `SELECT u.id, u.email, u.role,
                        p.username, p.first_name, p.last_name, p.profile_image
                 FROM users u
                 LEFT JOIN profiles p ON p.user_id = u.id
                 WHERE u.id = $1 AND u.deleted_at IS NULL`,
                [userId]
            );

            if (!userRows || userRows.length === 0) {
                throw new Error(`User with ID ${userId} not found in database`);
            }

            const user = userRows[0];

            await serverClient.upsertUser({
                id: userId.toString(),
                name: user.username || `${user.first_name} ${user.last_name}`.trim(),
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                image: user.profile_image,
                email: user.email,
                role: user.role
            });
        } catch (error) {
            console.error('Error creating/updating Stream user:', error);
            throw error;
        }
    }

    static async addUserToRoom(roomId, userId, userType = 'user', role = 'member') {
        // First, ensure the user exists in Stream Chat
        await this.createOrUpdateStreamUser(userId, userType);

        // Add to DB (ignore duplicate)
        await pool.query(
            `INSERT INTO chat_members (room_id, user_id, role) VALUES ($1, $2, $3)
             ON CONFLICT (room_id, user_id) DO NOTHING`,
            [roomId, userId, role]
        );
        // Add to Stream channel
        const channel = serverClient.channel('messaging', roomId);
        try {
            await channel.addMembers([userId.toString()]);
        } catch (err) {
            if (err.code !== 16) {
                console.error('Error adding user to Stream channel:', err);
                throw err;
            }
        }
    }

    static async storeMessage(messageData) {
        try {
            const {
                id, room_id, user_id, text,
                attachments, mentioned_users, parent_id,
                reaction_counts, reply_count
            } = messageData;

            if (!id || !room_id || !user_id) {
                throw new Error('Missing required fields: id, room_id, or user_id');
            }

            const result = await pool.query(`
                INSERT INTO chat_messages (
                    id, room_id, user_id, text,
                    attachments, mentioned_users, parent_id,
                    reaction_counts, reply_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
            `, [
                id, room_id, user_id, text,
                JSON.stringify(attachments || []), JSON.stringify(mentioned_users || []),
                parent_id || null,
                JSON.stringify(reaction_counts || {}), reply_count || 0
            ]);

            return result;
        } catch (error) {
            console.error('Error storing message:', error);
            throw error;
        }
    }

    static async getRoomMessages(roomId, limit = 50, before = null) {
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
        return messages.reverse();
    }

    static async getUserRooms(userId) {
        const { rows: rooms } = await pool.query(`
            SELECT cr.*, cm.role, cm.joined_at,
                (SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id) as message_count,
                (SELECT text FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM chat_rooms cr
            JOIN chat_members cm ON cr.id = cm.room_id
            WHERE cm.user_id = $1
            ORDER BY cr.updated_at DESC
        `, [userId]);
        return rooms;
    }

    static async setupChannelWebhook(channelId) {
        try {
            const channel = serverClient.channel('messaging', channelId);

            await channel.update({
                webhook_events: [
                    'message.new',
                    'message.updated',
                    'message.deleted',
                    'reaction.new',
                    'reaction.deleted'
                ]
            });
        } catch (error) {
            console.error('Error setting up channel webhook:', error);
        }
    }

    static setupWebhookHandlers() {
        return {
            'message.new': async (event) => {
                const message = event.message;
                await this.storeMessage({
                    id: message.id,
                    room_id: event.channel_id,
                    user_id: parseInt(message.user.id),
                    text: message.text,
                    attachments: message.attachments,
                    mentioned_users: message.mentioned_users,
                    parent_id: message.parent_id,
                    reaction_counts: message.reaction_counts,
                    reply_count: message.reply_count,
                });
            },

            'message.updated': async (event) => {
                try {
                    const message = event.message;
                    await pool.query(`
                        UPDATE chat_messages
                        SET text = $1, attachments = $2, reaction_counts = $3, reply_count = $4, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $5
                    `, [
                        message.text,
                        JSON.stringify(message.attachments || []),
                        JSON.stringify(message.reaction_counts || {}),
                        message.reply_count || 0,
                        message.id
                    ]);
                } catch (error) {
                    console.error('Error handling message.updated webhook:', error);
                }
            },

            'message.deleted': async (event) => {
                try {
                    await pool.query(
                        'UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
                        [event.message.id]
                    );
                } catch (error) {
                    console.error('Error handling message.deleted webhook:', error);
                }
            },

            'reaction.new': async (event) => {
                try {
                    await pool.query(`
                        INSERT INTO message_reactions (message_id, user_id, reaction_type)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (message_id, user_id, reaction_type) DO NOTHING
                    `, [
                        event.message.id,
                        parseInt(event.user.id),
                        event.reaction.type
                    ]);
                } catch (error) {
                    console.error('Error handling reaction.new webhook:', error);
                }
            },

            'reaction.deleted': async (event) => {
                try {
                    await pool.query(
                        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction_type = $3',
                        [event.message.id, parseInt(event.user.id), event.reaction.type]
                    );
                } catch (error) {
                    console.error('Error handling reaction.deleted webhook:', error);
                }
            }
        };
    }
}
