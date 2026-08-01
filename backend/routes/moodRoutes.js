/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import express from 'express';
import { getMood, setMood } from '../controllers/MoodController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getMood);
router.post('/', authenticate, setMood);

export default router;
