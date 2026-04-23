import { pool } from '../db/index.js';
import { sendPushNotificationAsync } from './NotificationService.js';
import { logger } from '../utils/logger.js';

const ALLOWED_USER_SORT_FIELDS = ['id', 'created_at', 'first_name', 'last_name', 'email'];
const ALLOWED_CONSULTANT_SORT_FIELDS = ['id', 'created_at', 'rating', 'first_name', 'last_name'];
const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = async (userId, role) => {
    try {
        let table;
        if (role === 'consultant') table = 'consultants';
        else if (role === 'admin' || role === 'super_admin') table = 'admin';
        else table = 'users';

        const [rows] = await pool.query(
            `SELECT id, username, first_name, last_name, email, profile_image, role, phone, dob, gender, push_token, push_notifications_enabled, created_at FROM ${table} WHERE id = ?`,
            [userId]
        );

        if (!rows || rows.length === 0) {
            return { success: false, message: 'User profile not found.' };
        }

        return { success: true, message: 'User profile retrieved.', user: rows[0] };
    } catch (error) {
        logger.error({ error }, 'getProfile failed');
        return { success: false, message: 'Profile not found. Please try again later.' };
    }
};

// ─── User Details ─────────────────────────────────────────────────────────────
export const getUserDetails = async (userId) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, email, username, first_name, last_name, role, created_at FROM users WHERE id = ?',
            [userId]
        );
        if (rows.length === 0) return { success: false, message: 'User not found' };
        return { success: true, message: 'User details fetched.', user: rows[0] };
    } catch (error) {
        logger.error({ error }, 'getUserDetails failed');
        return { success: false, message: 'Failed to fetch user data.' };
    }
};

// ─── Consultant Details ───────────────────────────────────────────────────────
export const getConsultantDetails = async (consultantId) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, email, username, first_name, last_name, role, profession, experience, rating, profile_image, created_at FROM consultants WHERE id = ?',
            [consultantId]
        );
        if (rows.length === 0) return { success: false, message: 'Consultant not found' };
        return { success: true, message: 'Consultant details fetched.', consultant: rows[0] };
    } catch (error) {
        logger.error({ error }, 'getConsultantDetails failed');
        return { success: false, message: 'Failed to fetch consultant data.' };
    }
};

// ─── List Consultants ─────────────────────────────────────────────────────────
export const getConsultants = async ({ page = 1, limit = 10, profession, search, sortBy = 'id', sortOrder = 'DESC' } = {}) => {
    try {
        const safeSortBy = ALLOWED_CONSULTANT_SORT_FIELDS.includes(sortBy) ? sortBy : 'id';
        const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        const offset = (page - 1) * limit;

        let query = `SELECT id, email, username, first_name, last_name, role, profession, experience, rating, profile_image, available_from, available_to, available_days, language, education, created_at FROM consultants`;
        const queryParams = [];
        const whereClauses = [];

        if (profession) {
            whereClauses.push('profession = ?');
            queryParams.push(profession);
        }
        if (search) {
            whereClauses.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
            const s = `%${search}%`;
            queryParams.push(s, s, s);
        }

        if (whereClauses.length > 0) query += ' WHERE ' + whereClauses.join(' AND ');
        query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
        queryParams.push(Number(limit), Number(offset));

        const [consultants] = await pool.query(query, queryParams);
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM consultants${whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : ''}`,
            queryParams.slice(0, -2)
        );

        return {
            success: true,
            message: 'Fetched consultants',
            consultants,
            pagination: { page: Number(page), limit: Number(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) },
        };
    } catch (error) {
        logger.error({ error }, 'getConsultants failed');
        return { success: false, message: 'Failed to fetch consultants data.' };
    }
};

// ─── List Users ───────────────────────────────────────────────────────────────
export const getUsers = async ({ page = 1, limit = 10, role, search, sortBy = 'id', sortOrder = 'DESC' } = {}) => {
    try {
        const safeSortBy = ALLOWED_USER_SORT_FIELDS.includes(sortBy) ? sortBy : 'id';
        const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        const offset = (page - 1) * limit;

        let query = `SELECT id, email, username, first_name, last_name, role, created_at, dob, profile_image, gender, updated_at FROM users`;
        const queryParams = [];
        const whereClauses = [];

        if (role) {
            whereClauses.push('role = ?');
            queryParams.push(role);
        }
        if (search) {
            whereClauses.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
            const s = `%${search}%`;
            queryParams.push(s, s, s);
        }

        if (whereClauses.length > 0) query += ' WHERE ' + whereClauses.join(' AND ');
        query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
        queryParams.push(Number(limit), Number(offset));

        const [users] = await pool.query(query, queryParams);
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM users${whereClauses.length > 0 ? ' WHERE ' + whereClauses.join(' AND ') : ''}`,
            queryParams.slice(0, -2)
        );

        return {
            success: true,
            message: 'Fetched users',
            users,
            pagination: { page: Number(page), limit: Number(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) },
        };
    } catch (error) {
        logger.error({ error }, 'getUsers failed');
        return { success: false, message: 'Failed to fetch users data.' };
    }
};

// ─── Delete ───────────────────────────────────────────────────────────────────
export const deleteUser = async (userId) => {
    try {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        if (result.affectedRows === 0) return { success: false, message: 'User not found' };
        return { success: true, message: 'User deleted.' };
    } catch (error) {
        logger.error({ error }, 'deleteUser failed');
        return { success: false, message: 'Failed to delete user.' };
    }
};

export const deleteConsultant = async (consultantId) => {
    try {
        const [result] = await pool.query('DELETE FROM consultants WHERE id = ?', [consultantId]);
        if (result.affectedRows === 0) return { success: false, message: 'Consultant not found' };
        return { success: true, message: 'Consultant deleted.' };
    } catch (error) {
        logger.error({ error }, 'deleteConsultant failed');
        return { success: false, message: 'Failed to delete consultant.' };
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfile = async (userId, role, fieldsToUpdate) => {
    try {
        let table;
        if (role === 'consultant') table = 'consultants';
        else if (role === 'admin' || role === 'super_admin') table = 'admin';
        else table = 'users';

        const ALLOWED_FIELDS = ['username', 'email', 'first_name', 'last_name', 'phone', 'profile_image', 'dob', 'gender'];
        const updateFields = [];
        const updateValues = [];

        Object.entries(fieldsToUpdate).forEach(([key, value]) => {
            if (ALLOWED_FIELDS.includes(key) && value !== undefined && value !== null && value !== '') {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        });

        if (updateFields.length === 0) {
            return { success: false, message: 'No valid fields to update.' };
        }

        updateValues.push(userId);
        const [result] = await pool.query(`UPDATE ${table} SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

        if (result.affectedRows === 0) {
            return { success: false, message: 'No changes made.' };
        }

        const updatedProfile = await getProfile(userId, role);
        return { success: true, message: 'Profile updated successfully.', user: updatedProfile.user };
    } catch (error) {
        logger.error({ error }, 'updateProfile failed');
        return { success: false, message: 'Failed to update profile.' };
    }
};

// ─── Push Tokens (userId derived from auth token, not request body) ───────────
export const saveUserPushToken = async (userId, pushToken) => {
    await pool.query('UPDATE users SET push_token = ? WHERE id = ?', [pushToken, userId]);
};

export const saveConsultantPushToken = async (consultantId, pushToken) => {
    await pool.query('UPDATE consultants SET push_token = ? WHERE id = ?', [pushToken, consultantId]);
};

// ─── Push Notifications ───────────────────────────────────────────────────────
export const sendPushNotificationToUser = async (userId, title, body, data) => {
    try {
        const [rows] = await pool.query('SELECT push_token, push_notifications_enabled FROM users WHERE id = ?', [userId]);
        if (!rows.length || !rows[0].push_token || rows[0].push_notifications_enabled === false) {
            return { success: false, message: 'Push notifications disabled or token not found.' };
        }
        const result = await sendPushNotificationAsync(rows[0].push_token, title, body, data);
        await saveNotification({ recipientId: userId, title, body, data });
        return result;
    } catch (error) {
        logger.error({ error }, 'sendPushNotificationToUser failed');
        return { success: false, message: 'Failed to send notification.' };
    }
};

export const sendPushNotificationToConsultant = async (consultantId, title, body, data) => {
    try {
        const [rows] = await pool.query('SELECT push_token, push_notifications_enabled FROM consultants WHERE id = ?', [consultantId]);
        if (!rows.length || !rows[0].push_token || rows[0].push_notifications_enabled === false) {
            return { success: false, message: 'Push notifications disabled or token not found.' };
        }
        const result = await sendPushNotificationAsync(rows[0].push_token, title, body, data);
        await saveNotification({ recipientId: consultantId, title, body, data });
        return result;
    } catch (error) {
        logger.error({ error }, 'sendPushNotificationToConsultant failed');
        return { success: false, message: 'Failed to send notification.' };
    }
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const saveNotification = async ({ recipientId, title, body, data }) => {
    await pool.query(
        'INSERT INTO notifications (recipient_id, title, body, data) VALUES (?, ?, ?, ?)',
        [recipientId, title, body, JSON.stringify(data || {})]
    );
};

export const getNotificationsForUser = async (userId) => {
    const [rows] = await pool.query(
        'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
    );
    return rows;
};

// Phase 3.8 — ownership check: only mark your own notifications as read
export const markNotificationAsRead = async (notificationId, userId) => {
    await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = ? AND recipient_id = ?',
        [notificationId, userId]
    );
};

export const updateUserNotificationPreference = async (userId, enabled) => {
    await pool.query('UPDATE users SET push_notifications_enabled = ? WHERE id = ?', [enabled, userId]);
    return { success: true, message: 'Notification preference updated.' };
};

export const updateConsultantNotificationPreference = async (consultantId, enabled) => {
    await pool.query('UPDATE consultants SET push_notifications_enabled = ? WHERE id = ?', [enabled, consultantId]);
    return { success: true, message: 'Notification preference updated.' };
};
