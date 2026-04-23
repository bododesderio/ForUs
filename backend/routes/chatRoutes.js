import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
    generateChatToken,
    createChatRoom,
    getUserRooms,
    getRoomMessages,
    joinRoom,
    handleStreamWebhook,
    verifyWebhookSignature
} from '../controllers/ChatController.js';

const router = express.Router();

router.get('/token', authenticate, generateChatToken);
router.post('/rooms', authenticate, createChatRoom);
router.get('/rooms', authenticate, getUserRooms);
router.get('/rooms/:roomId/messages', authenticate, getRoomMessages);
router.post('/rooms/:roomId/join', authenticate, joinRoom);
router.post('/webhook', verifyWebhookSignature, handleStreamWebhook);

export default router;
