/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import {
    getProfile,
    getUserDetails,
    getConsultantDetails,
    getConsultants,
    getUsers,
    deleteUser,
    deleteConsultant,
    updateProfile,
    saveUserPushToken,
    sendPushNotificationToUser,
    saveConsultantPushToken as saveConsultantPushTokenService,
    sendPushNotificationToConsultant as sendPushNotificationToConsultantService,
    saveNotification,
    getNotificationsForUser,
    markNotificationAsRead,
    updateUserNotificationPreference,
    updateConsultantNotificationPreference,
} from '../services/UserServices.js';
import { logActivity } from '../services/ActivityService.js';

export const profile = async (req, res) => {
    try {
        const response = await getProfile(req.user.id, req.user.role);
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
};

export const user = async (req, res) => {
    try {
        const response = await getUserDetails(req.params.id);
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch user details.' });
    }
};

export const consultant = async (req, res) => {
    try {
        const response = await getConsultantDetails(req.params.id);
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch consultant details.' });
    }
};

export const consultants = async (req, res) => {
    try {
        const response = await getConsultants(req.query);
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch consultants.' });
    }
};

export const users = async (req, res) => {
    try {
        const response = await getUsers(req.query);
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users.' });
    }
};

export const del_user = async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
        const response = await deleteUser(req.params.id);
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user.' });
    }
};

export const del_consultant = async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    try {
        const response = await deleteConsultant(req.params.id);
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete consultant.' });
    }
};

export const prof_update = async (req, res) => {
    const { username, email, first_name, last_name, phone, profile_image, dob, gender } = req.body;
    const fieldsToUpdate = { username, email, first_name, last_name, phone, profile_image, dob, gender };
    const hasValidFields = Object.values(fieldsToUpdate).some(v => v !== undefined && v !== null && v !== '');

    if (!hasValidFields) {
        return res.status(400).json({ success: false, message: 'At least one field is required to update.' });
    }

    try {
        const response = await updateProfile(req.user.id, req.user.role, fieldsToUpdate);
        if (response.success) {
            await logActivity(req.user.id, req.user.role, 'profile_update', 'Updated profile');
        }
        return res.status(response.success ? 200 : 400).json(response);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update profile.' });
    }
};

// Phase 3.7 — derive userId from req.user.id, not request body
export const savePushToken = async (req, res) => {
    try {
        const { pushToken } = req.body;
        if (!pushToken) return res.status(400).json({ success: false, message: 'pushToken is required' });
        await saveUserPushToken(req.user.id, pushToken);
        res.status(200).json({ success: true, message: 'Push token saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const sendPushNotification = async (req, res) => {
    try {
        const { userId, title, body, data } = req.body;
        if (!userId || !title || !body) {
            return res.status(400).json({ success: false, message: 'userId, title, and body are required' });
        }
        const result = await sendPushNotificationToUser(userId, title, body, data);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Phase 3.7 — derive consultantId from req.user.id
export const saveConsultantPushToken = async (req, res) => {
    try {
        const { pushToken } = req.body;
        if (!pushToken) return res.status(400).json({ success: false, message: 'pushToken is required' });
        await saveConsultantPushTokenService(req.user.id, pushToken);
        res.status(200).json({ success: true, message: 'Consultant push token saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const sendPushNotificationToConsultant = async (req, res) => {
    try {
        const { consultantId, title, body, data } = req.body;
        if (!consultantId || !title || !body) {
            return res.status(400).json({ success: false, message: 'consultantId, title, and body are required' });
        }
        const result = await sendPushNotificationToConsultantService(consultantId, title, body, data);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const saveNotificationController = async (req, res) => {
    try {
        const { title, body, data } = req.body;
        await saveNotification({ recipientId: req.user.id, title, body, data });
        res.status(200).json({ success: true, message: 'Notification saved' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserNotifications = async (req, res) => {
    try {
        const notifications = await getNotificationsForUser(req.user.id);
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getConsultantNotifications = async (req, res) => {
    try {
        const notifications = await getNotificationsForUser(req.user.id);
        res.status(200).json({ success: true, notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Phase 3.8 — pass userId for ownership check
export const markNotificationRead = async (req, res) => {
    try {
        const { notificationId } = req.body;
        if (!notificationId) return res.status(400).json({ success: false, message: 'notificationId is required' });
        await markNotificationAsRead(notificationId, req.user.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateNotificationPreference = async (req, res) => {
    const { enabled } = req.body;
    try {
        let result;
        if (req.user.role === 'consultant') {
            result = await updateConsultantNotificationPreference(req.user.id, enabled);
        } else {
            result = await updateUserNotificationPreference(req.user.id, enabled);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
