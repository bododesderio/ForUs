/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pool } from '../db/index.js';
import { sendPushNotificationAsync } from './NotificationService.js';
import { logger } from '../utils/logger.js';

const ALLOWED_USER_SORT_FIELDS = ['id', 'created_at', 'first_name', 'last_name', 'email'];
const ALLOWED_CONSULTANT_SORT_FIELDS = ['id', 'created_at', 'rating', 'first_name', 'last_name'];
const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = async (userId, role) => {
    try {
        let query;
        if (role === 'consultant') {
            query = `SELECT u.id, u.email, u.role, u.is_active, u.created_at,
                            p.username, p.first_name, p.last_name, p.profile_image, p.phone, p.dob, p.gender, p.push_token, p.notifications_enabled,
                            cd.profession, cd.experience, cd.rating, cd.education, cd.language, cd.available_from, cd.available_to, cd.available_days, cd.is_approved
                     FROM users u
                     LEFT JOIN profiles p ON p.user_id = u.id
                     LEFT JOIN consultant_details cd ON cd.user_id = u.id
                     WHERE u.id = $1 AND u.deleted_at IS NULL`;
        } else {
            query = `SELECT u.id, u.email, u.role, u.is_active, u.created_at,
                            p.username, p.first_name, p.last_name, p.profile_image, p.phone, p.dob, p.gender, p.push_token, p.notifications_enabled
                     FROM users u
                     LEFT JOIN profiles p ON p.user_id = u.id
                     WHERE u.id = $1 AND u.deleted_at IS NULL`;
        }

        const { rows } = await pool.query(query, [userId]);

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
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.role, u.created_at,
                    p.username, p.first_name, p.last_name
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
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
        const { rows } = await pool.query(
            `SELECT u.id, u.email, u.role, u.created_at,
                    p.username, p.first_name, p.last_name, p.profile_image,
                    cd.profession, cd.experience, cd.rating, cd.education, cd.language,
                    cd.available_from, cd.available_to, cd.available_days
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             LEFT JOIN consultant_details cd ON cd.user_id = u.id
             WHERE u.id = $1 AND u.role = 'consultant' AND u.deleted_at IS NULL`,
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

        // Map sort fields to correct table aliases
        const sortFieldMap = { id: 'u.id', created_at: 'u.created_at', rating: 'cd.rating', first_name: 'p.first_name', last_name: 'p.last_name' };
        const sortColumn = sortFieldMap[safeSortBy] || 'u.id';

        let paramIdx = 1;
        const queryParams = [];
        const whereClauses = [`u.role = 'consultant'`, `u.deleted_at IS NULL`];

        if (profession) {
            whereClauses.push(`cd.profession = $${paramIdx++}`);
            queryParams.push(profession);
        }
        if (search) {
            whereClauses.push(`(p.first_name ILIKE $${paramIdx} OR p.last_name ILIKE $${paramIdx + 1} OR u.email ILIKE $${paramIdx + 2})`);
            const s = `%${search}%`;
            queryParams.push(s, s, s);
            paramIdx += 3;
        }

        const whereClause = 'WHERE ' + whereClauses.join(' AND ');

        const query = `SELECT u.id, u.email, u.role, u.created_at,
                              p.username, p.first_name, p.last_name, p.profile_image,
                              cd.profession, cd.experience, cd.rating, cd.education, cd.language,
                              cd.available_from, cd.available_to, cd.available_days
                       FROM users u
                       LEFT JOIN profiles p ON p.user_id = u.id
                       LEFT JOIN consultant_details cd ON cd.user_id = u.id
                       ${whereClause}
                       ORDER BY ${sortColumn} ${safeSortOrder}
                       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        queryParams.push(Number(limit), Number(offset));

        const { rows: consultants } = await pool.query(query, queryParams);

        const countParams = queryParams.slice(0, -2);
        const { rows: countResult } = await pool.query(
            `SELECT COUNT(*) as total FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             LEFT JOIN consultant_details cd ON cd.user_id = u.id
             ${whereClause}`,
            countParams
        );

        const total = parseInt(countResult[0].total);
        return {
            success: true,
            message: 'Fetched consultants',
            consultants,
            pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
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

        const sortFieldMap = { id: 'u.id', created_at: 'u.created_at', first_name: 'p.first_name', last_name: 'p.last_name', email: 'u.email' };
        const sortColumn = sortFieldMap[safeSortBy] || 'u.id';

        let paramIdx = 1;
        const queryParams = [];
        const whereClauses = ['u.deleted_at IS NULL'];

        if (role) {
            whereClauses.push(`u.role = $${paramIdx++}`);
            queryParams.push(role);
        }
        if (search) {
            whereClauses.push(`(p.first_name ILIKE $${paramIdx} OR p.last_name ILIKE $${paramIdx + 1} OR u.email ILIKE $${paramIdx + 2})`);
            const s = `%${search}%`;
            queryParams.push(s, s, s);
            paramIdx += 3;
        }

        const whereClause = 'WHERE ' + whereClauses.join(' AND ');

        const query = `SELECT u.id, u.email, u.role, u.created_at, u.updated_at,
                              p.username, p.first_name, p.last_name, p.profile_image, p.dob, p.gender
                       FROM users u
                       LEFT JOIN profiles p ON p.user_id = u.id
                       ${whereClause}
                       ORDER BY ${sortColumn} ${safeSortOrder}
                       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        queryParams.push(Number(limit), Number(offset));

        const { rows: users } = await pool.query(query, queryParams);

        const countParams = queryParams.slice(0, -2);
        const { rows: countResult } = await pool.query(
            `SELECT COUNT(*) as total FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             ${whereClause}`,
            countParams
        );

        const total = parseInt(countResult[0].total);
        return {
            success: true,
            message: 'Fetched users',
            users,
            pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) },
        };
    } catch (error) {
        logger.error({ error }, 'getUsers failed');
        return { success: false, message: 'Failed to fetch users data.' };
    }
};

// ─── Delete ───────────────────────────────────────────────────────────────────
export const deleteUser = async (userId) => {
    try {
        // Soft delete
        const result = await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL', [userId]);
        if (result.rowCount === 0) return { success: false, message: 'User not found' };
        return { success: true, message: 'User deleted.' };
    } catch (error) {
        logger.error({ error }, 'deleteUser failed');
        return { success: false, message: 'Failed to delete user.' };
    }
};

export const deleteConsultant = async (consultantId) => {
    try {
        // Soft delete — consultants are in the users table
        const result = await pool.query(
            `UPDATE users SET deleted_at = NOW() WHERE id = $1 AND role = 'consultant' AND deleted_at IS NULL`,
            [consultantId]
        );
        if (result.rowCount === 0) return { success: false, message: 'Consultant not found' };
        return { success: true, message: 'Consultant deleted.' };
    } catch (error) {
        logger.error({ error }, 'deleteConsultant failed');
        return { success: false, message: 'Failed to delete consultant.' };
    }
};

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfile = async (userId, role, fieldsToUpdate) => {
    try {
        const PROFILE_FIELDS = ['username', 'first_name', 'last_name', 'phone', 'profile_image', 'dob', 'gender'];
        const USER_FIELDS = ['email'];
        const profileUpdates = [];
        const profileValues = [];
        const userUpdates = [];
        const userValues = [];
        let profileParamIdx = 1;
        let userParamIdx = 1;

        Object.entries(fieldsToUpdate).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (PROFILE_FIELDS.includes(key)) {
                    profileUpdates.push(`${key} = $${profileParamIdx++}`);
                    profileValues.push(value);
                } else if (USER_FIELDS.includes(key)) {
                    userUpdates.push(`${key} = $${userParamIdx++}`);
                    userValues.push(value);
                }
            }
        });

        if (profileUpdates.length === 0 && userUpdates.length === 0) {
            return { success: false, message: 'No valid fields to update.' };
        }

        let updated = false;

        if (profileUpdates.length > 0) {
            profileValues.push(userId);
            const result = await pool.query(
                `UPDATE profiles SET ${profileUpdates.join(', ')} WHERE user_id = $${profileParamIdx}`,
                profileValues
            );
            if (result.rowCount > 0) updated = true;
        }

        if (userUpdates.length > 0) {
            userUpdates.push(`updated_at = NOW()`);
            userValues.push(userId);
            const result = await pool.query(
                `UPDATE users SET ${userUpdates.join(', ')} WHERE id = $${userParamIdx + 1}`,
                userValues
            );
            if (result.rowCount > 0) updated = true;
        }

        if (!updated) {
            return { success: false, message: 'No changes made.' };
        }

        const updatedProfile = await getProfile(userId, role);
        return { success: true, message: 'Profile updated successfully.', user: updatedProfile.user };
    } catch (error) {
        logger.error({ error }, 'updateProfile failed');
        return { success: false, message: 'Failed to update profile.' };
    }
};

// ─── Push Tokens ─────────────────────────────────────────────────────────────
export const saveUserPushToken = async (userId, pushToken) => {
    await pool.query('UPDATE profiles SET push_token = $1 WHERE user_id = $2', [pushToken, userId]);
};

export const saveConsultantPushToken = async (consultantId, pushToken) => {
    await pool.query('UPDATE profiles SET push_token = $1 WHERE user_id = $2', [pushToken, consultantId]);
};

// ─── Push Notifications ───────────────────────────────────────────────────────
export const sendPushNotificationToUser = async (userId, title, body, data) => {
    try {
        const { rows } = await pool.query(
            'SELECT push_token, notifications_enabled FROM profiles WHERE user_id = $1',
            [userId]
        );
        if (!rows.length || !rows[0].push_token || rows[0].notifications_enabled === false) {
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
        const { rows } = await pool.query(
            'SELECT push_token, notifications_enabled FROM profiles WHERE user_id = $1',
            [consultantId]
        );
        if (!rows.length || !rows[0].push_token || rows[0].notifications_enabled === false) {
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
        'INSERT INTO notifications (recipient_id, title, body, data) VALUES ($1, $2, $3, $4)',
        [recipientId, title, body, JSON.stringify(data || {})]
    );
};

export const getNotificationsForUser = async (userId) => {
    const { rows } = await pool.query(
        'SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 50',
        [userId]
    );
    return rows;
};

export const markNotificationAsRead = async (notificationId, userId) => {
    await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2',
        [notificationId, userId]
    );
};

export const updateUserNotificationPreference = async (userId, enabled) => {
    await pool.query('UPDATE profiles SET notifications_enabled = $1 WHERE user_id = $2', [enabled, userId]);
    return { success: true, message: 'Notification preference updated.' };
};

export const updateConsultantNotificationPreference = async (consultantId, enabled) => {
    await pool.query('UPDATE profiles SET notifications_enabled = $1 WHERE user_id = $2', [enabled, consultantId]);
    return { success: true, message: 'Notification preference updated.' };
};
