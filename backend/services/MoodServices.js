/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import {pool} from '../db/index.js';

// Get mood for a user and date
export const getUserMood = async (user_id, date) => {
    try {
        const { rows } = await pool.query(
        'SELECT mood FROM moods WHERE user_id = $1 AND mood_date = $2',
        [user_id, date]
        );
        if (rows.length === 0) return null;
        return rows[0].mood;
    } catch (error) {
        throw error;
    }
};

// Set or update mood for a user and date
export const setUserMood = async (user_id, date, mood) => {
    try {
        await pool.query(
        `INSERT INTO moods (user_id, mood_date, mood) VALUES ($1, $2, $3)
        ON CONFLICT (user_id, mood_date) DO UPDATE SET mood = EXCLUDED.mood, updated_at = CURRENT_TIMESTAMP`,
        [user_id, date, mood]
        );
        return true;
    } catch (error) {
        throw error;
    }
};
