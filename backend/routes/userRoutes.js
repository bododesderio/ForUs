/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import express from 'express';
import { profile, user, consultant, consultants, users, del_consultant, del_user, prof_update, savePushToken, sendPushNotification, saveConsultantPushToken, sendPushNotificationToConsultant, saveNotificationController, getUserNotifications, getConsultantNotifications, markNotificationRead, updateNotificationPreference } from '../controllers/UserController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, profile);
router.patch('/update-profile', authenticate, prof_update);
router.get('/user/:id', authenticate, user);
router.get('/consultant/:id', authenticate, consultant);
router.get('/consultants', authenticate, consultants);
router.get('/users', authenticate, users);
router.delete('/delete/user/:id', authenticate, del_user);
router.delete('/delete/consultant/:id', authenticate, del_consultant);
router.post('/push-token', authenticate, savePushToken);
router.post('/send-notification', authenticate, sendPushNotification);
router.post('/consultant/push-token', authenticate, saveConsultantPushToken);
router.post('/consultant/send-notification', authenticate, sendPushNotificationToConsultant);
router.post('/notification/save', authenticate, saveNotificationController);
router.get('/notifications', authenticate, getUserNotifications);
router.get('/consultant/notifications', authenticate, getConsultantNotifications);
router.post('/notification/read', authenticate, markNotificationRead);
router.patch('/notification-preference', authenticate, updateNotificationPreference);

export default router;
