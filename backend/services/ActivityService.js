import { pool } from '../db/index.js';

export const logActivity = async (userId, role, type, description) => {
    try {
        await pool.query(
            'INSERT INTO activities (user_id, role, type, description) VALUES (?, ?, ?, ?)',
            [userId, role, type, description]
        );
    } catch (error) {
        // Activity logging should never crash the main request
        console.error('[ActivityService] Failed to log activity:', error.message);
    }
};
