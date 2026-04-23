import express from 'express';
import {register, login, consultant, logout, changePassword, savePushToken, sendPushNotification} from '../controllers/AuthController.js';
import { refreshToken } from '../middleware/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register-user', register)
router.post('/register-consultant', consultant) 
router.post('/login-user', login)
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/change-password', authenticate, changePassword);
router.post('/push-token', savePushToken);
router.post('/send-notification', sendPushNotification);

export default router;
