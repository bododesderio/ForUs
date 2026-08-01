/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pool } from '../db/index.js';

export const logActivity = async (userId, role, type, description) => {
    try {
        await pool.query(
            'INSERT INTO activities (user_id, type, description) VALUES ($1, $2, $3)',
            [userId, type, description]
        );
    } catch (error) {
        // Activity logging should never crash the main request
        console.error('[ActivityService] Failed to log activity:', error.message);
    }
};
