/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { logger } from '../utils/logger.js';

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authorization header missing or malformed' });
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
};

export const refreshToken = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Validate token exists in DB and is not expired
        const { rows } = await pool.query(
            'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
            [refreshToken]
        );
        if (!rows || rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Refresh token revoked or expired' });
        }

        const newAccessToken = jwt.sign(
            { id: decoded.id, email: decoded.email, role: decoded.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        return res.json({ success: true, accessToken: newAccessToken });
    } catch (err) {
        logger.warn({ err: err.message }, 'Refresh token validation failed');
        return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }
};
