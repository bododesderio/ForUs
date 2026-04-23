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
        const [existingRoom] = await pool.query('SELECT * FROM chat_rooms WHERE id = ?', [roomId]);
        if (existingRoom.length === 0) {
            await pool.query(
                'INSERT INTO chat_rooms (id, name, type, created_by) VALUES (?, ?, ?, ?)',
                [roomId, roomData.name, roomData.type || 'messaging', createdBy]
            );
        }
        
        // Extract type from roomData and use it as channel type, not in data
        const channelType = roomData.type || 'messaging';
        
        // Create channel data object without the 'type' field
        const channelData = {
            name: roomData.name,
            created_by_id: createdBy.toString(),
            // Add any other custom fields here, but NOT 'type'
        };
        
        // Add any additional fields from roomData except 'type'
        Object.keys(roomData).forEach(key => {
            if (key !== 'type' && key !== 'name') {
                channelData[key] = roomData[key];
            }
        });
        
        // Create/get channel in Stream - type goes as first parameter, not in data
        const channel = serverClient.channel(channelType, roomId, channelData);
        await channel.create();
        return channel;
    }

    static async createOrUpdateStreamUser(userId, userType = 'user') {
        try {
            let userRows = null;
            // Get user data from your database based on userType
            if(userType === 'user') {
                [userRows] = await pool.query(
                    'SELECT id, username, first_name, last_name, profile_image, email FROM users WHERE id = ?',
                    [userId]
                );
            } else if(userType === 'consultant') {
                [userRows] = await pool.query(
                    'SELECT id, username, first_name, last_name, profile_image, email FROM consultants WHERE id = ?',
                    [userId]
                );
            } else if(userType === 'admin') {
                [userRows] = await pool.query(
                    'SELECT id, username, first_name, last_name, profile_image, email FROM admin WHERE id = ?',
                    [userId]
                );
            }
            
            if (!userRows || userRows.length === 0) {
                throw new Error(`${userType} with ID ${userId} not found in database`);
            }
            
            const user = userRows[0];
            
            // Create or update user in Stream Chat
            await serverClient.upsertUser({
                id: userId.toString(),
                name: user.username || `${user.first_name} ${user.last_name}`.trim(),
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                image: user.profile_image,
                email: user.email,
                role: userType
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
            'INSERT IGNORE INTO chat_members (room_id, user_id, user_type, role) VALUES (?, ?, ?, ?)',
            [roomId, userId, userType, role]
        );
        // Add to Stream channel
        const channel = serverClient.channel('messaging', roomId);
        try {
            await channel.addMembers([userId.toString()]);
        } catch (err) {
            // Ignore "user already a member" error (Stream error code 16)
            if (err.code !== 16) {
                console.error('Error adding user to Stream channel:', err);
                throw err;
            }
        }
    }

    static async storeMessage(messageData) {
        console.log('Attempting to store message:', messageData);
        
        try {
            const {
                id, room_id, user_id, user_type, message_type, text,
                attachments, mentioned_users, parent_id, thread_participants,
                reaction_counts, reply_count, stream_message_id
            } = messageData;
            
            // Validate required fields
            if (!id || !room_id || !user_id) {
                throw new Error('Missing required fields: id, room_id, or user_id');
            }
            
            const result = await pool.query(`
                INSERT INTO chat_messages (
                    id, room_id, user_id, user_type, message_type, text, 
                    attachments, mentioned_users, parent_id, thread_participants, 
                    reaction_counts, reply_count, stream_message_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id, room_id, user_id, user_type, message_type || 'regular', text,
                JSON.stringify(attachments || []), JSON.stringify(mentioned_users || []),
                parent_id, JSON.stringify(thread_participants || []),
                JSON.stringify(reaction_counts || {}), reply_count || 0, stream_message_id
            ]);
            
            console.log('Message stored successfully:', result);
            return result;
        } catch (error) {
            console.error('Error storing message:', error);
            throw error;
        }
    }

    static async getRoomMessages(roomId, limit = 50, before = null) {
        let query = `
            SELECT cm.*, u.username, u.first_name, u.last_name, u.profile_image
            FROM chat_messages cm
            LEFT JOIN users u ON cm.user_id = u.id AND cm.user_type = 'user'
            WHERE cm.room_id = ? AND cm.deleted_at IS NULL
        `;
        const params = [roomId];
        if (before) {
            query += ' AND cm.created_at < ?';
            params.push(before);
        }
        query += ' ORDER BY cm.created_at DESC LIMIT ?';
        params.push(limit);
        const [messages] = await pool.query(query, params);
        return messages.reverse();
    }

    static async getUserRooms(userId, userType = 'user') {
        const [rooms] = await pool.query(`
            SELECT cr.*, cm.role, cm.joined_at,
                (SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id) as message_count,
                (SELECT text FROM chat_messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as last_message
            FROM chat_rooms cr
            JOIN chat_members cm ON cr.id = cm.room_id
            WHERE cm.user_id = ? AND cm.user_type = ?
            ORDER BY cr.updated_at DESC
        `, [userId, userType]);
        return rooms;
    }

    static async setupChannelWebhook(channelId) {
        try {
            const channel = serverClient.channel('messaging', channelId);
            
            // Enable events for this channel
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
                    user_type: message.user.role || 'user',
                    message_type: message.type,
                    text: message.text,
                    attachments: message.attachments,
                    mentioned_users: message.mentioned_users,
                    parent_id: message.parent_id,
                    thread_participants: message.thread_participants,
                    reaction_counts: message.reaction_counts,
                    reply_count: message.reply_count,
                    stream_message_id: message.id
                });
            },
            
            'message.updated': async (event) => {
                try {
                    const message = event.message;
                    await pool.query(`
                        UPDATE chat_messages 
                        SET text = ?, attachments = ?, reaction_counts = ?, reply_count = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
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
                    await pool.query(`
                        UPDATE chat_messages 
                        SET deleted_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    `, [event.message.id]);
                } catch (error) {
                    console.error('Error handling message.deleted webhook:', error);
                }
            },

            'reaction.new': async (event) => {
                try {
                    await pool.query(`
                        INSERT INTO message_reactions (message_id, user_id, user_type, reaction_type)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
                    `, [
                        event.message.id,
                        parseInt(event.user.id),
                        event.user.role || 'user',
                        event.reaction.type
                    ]);
                } catch (error) {
                    console.error('Error handling reaction.new webhook:', error);
                }
            },

            'reaction.deleted': async (event) => {
                try {
                    await pool.query(`
                        DELETE FROM message_reactions 
                        WHERE message_id = ? AND user_id = ? AND reaction_type = ?
                    `, [
                        event.message.id,
                        parseInt(event.user.id),
                        event.reaction.type
                    ]);
                } catch (error) {
                    console.error('Error handling reaction.deleted webhook:', error);
                }
            }
        };
    }
}
