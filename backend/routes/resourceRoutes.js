import express from 'express';
import { uploadResource, fetchResources } from '../controllers/ResourceController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/upload', authenticate, uploadResource);
router.get('/', fetchResources);

export default router;
