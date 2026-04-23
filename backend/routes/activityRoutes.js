import express from 'express';
import { pool } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, type, description, created_at FROM activities WHERE user_id = ? AND role = ? ORDER BY created_at DESC LIMIT 20',
            [req.user.id, req.user.role]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch activities' });
    }
});

export default router;
