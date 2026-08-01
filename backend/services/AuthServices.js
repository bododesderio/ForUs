/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pool } from "../db/index.js"
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendPushNotificationAsync } from './NotificationService.js';

export const registerUser = async(user) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hashedPassword = await bcrypt.hash(user.password, 10);

        const { rows } = await client.query(
            `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'user') RETURNING id, email, role`,
            [user.email, hashedPassword]
        );
        const newUser = rows[0];

        await client.query(
            `INSERT INTO profiles (user_id, username, profile_image) VALUES ($1, $2, $3)`,
            [newUser.id, user.username, user.profile_image || null]
        );

        await client.query('COMMIT');

        return {
            success: true,
            message: 'User Registered Successfully.',
            user: {
                id: newUser.id,
                email: newUser.email,
                username: user.username,
                role: newUser.role,
                profile_image: user.profile_image
            }
        };
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return { success: false, message: 'Email already exists' };
        }
        return {
            success: false,
            message: 'Registration failed: ' + error.message
        };
    } finally {
        client.release();
    }
};

export const registerConsultant = async(user) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hashedPassword = await bcrypt.hash(user.password, 10);

        const { rows } = await client.query(
            `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'consultant') RETURNING id, email, role`,
            [user.email, hashedPassword]
        );
        const newUser = rows[0];

        await client.query(
            `INSERT INTO profiles (user_id, username, first_name, last_name) VALUES ($1, $2, $3, $4)`,
            [newUser.id, user.username, user.first_name, user.last_name]
        );

        await client.query(
            `INSERT INTO consultant_details (user_id) VALUES ($1)`,
            [newUser.id]
        );

        await client.query('COMMIT');
        return { success: true, message: 'Consultant Registered Successfully.', user: { id: newUser.id, email: newUser.email, role: newUser.role } };
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '23505') {
            return { success: false, message: 'Email already exists' };
        }
        return { success: false, message: 'Registration failed.' };
    } finally {
        client.release();
    }
};

export const loginUser = async(email, password) => {
    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
                    p.username, p.first_name, p.last_name, p.profile_image, p.push_token
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.email = $1 AND u.deleted_at IS NULL`,
            [email]
        );

        if (!rows || rows.length === 0) {
            return { success: false, message: "User does not exist." };
        }

        const user = rows[0];

        if (!user.is_active) {
            return { success: false, message: "Account is deactivated." };
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return { success: false, message: "Invalid credentials." };
        }

        // If consultant, fetch extra details
        if (user.role === 'consultant') {
            const { rows: detailRows } = await pool.query(
                `SELECT cd.*,
                        COALESCE(COUNT(r.id), 0)::int as total_reviews,
                        ROUND(COALESCE(AVG(r.rating), 0), 2)::float as average_rating
                 FROM consultant_details cd
                 LEFT JOIN reviews r ON r.consultant_id = cd.user_id
                 WHERE cd.user_id = $1
                 GROUP BY cd.id`,
                [user.id]
            );
            if (detailRows.length > 0) {
                Object.assign(user, detailRows[0]);
            }
        }

        // Never return password hash to client
        delete user.password_hash;

        return {
            success: true,
            message: 'Login Successful',
            user
        };
    } catch (error) {
        return { success: false, message: "Login failed. Please try again later." };
    }
};

// Store refresh token in DB
export const storeRefreshToken = async (userId, refreshToken) => {
    await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
        [userId, refreshToken]
    );
};

// Remove refresh token from DB (logout/revoke)
export const revokeRefreshToken = async (refreshToken) => {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
};

// Find refresh token in DB
export const findRefreshToken = async (refreshToken) => {
    const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    return rows.length > 0;
};

// Change password for any role (all in users table)
export const changePasswordForAnyRole = async (userId, role, currentPassword, newPassword) => {
    try {
        const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [userId]);
        if (!rows || rows.length === 0) {
            return { success: false, message: 'Account not found.' };
        }
        const user = rows[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return { success: false, message: 'Current password is incorrect.' };
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
        return { success: true, message: 'Password changed successfully.' };
    } catch (error) {
        return { success: false, message: 'Password change failed.' };
    }
};

export const saveAuthPushToken = async (authId, pushToken) => {
    await pool.query('UPDATE profiles SET push_token = $1 WHERE user_id = $2', [pushToken, authId]);
};

export const sendPushNotificationToAuth = async (authId, title, body, data) => {
    const { rows } = await pool.query('SELECT push_token FROM profiles WHERE user_id = $1', [authId]);
    if (!rows.length || !rows[0].push_token) {
        throw new Error('Push token not found');
    }
    return await sendPushNotificationAsync(rows[0].push_token, title, body, data);
};
