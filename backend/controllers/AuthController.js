import {registerUser, loginUser, registerConsultant, storeRefreshToken, revokeRefreshToken, findRefreshToken, changePasswordForAnyRole, saveAuthPushToken, sendPushNotificationToAuth} from '../services/AuthServices.js';
import { pool } from "../db/index.js";
import { logActivity } from "../services/ActivityService.js";
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';

export const register = async(req, res) => {
    const {username, email, password, profile_image} = req.body;  

        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

    const { rows: existingUsers } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

    const user = {username, email, password, profile_image};

    try {
        const response = await registerUser(user);
        if(response.success){
            // Log activity for user registration
            await logActivity(response.user.id, 'user', 'register', 'User registered');
            return res.status(201).json(response); 
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return {success: false, message: 'Registration failed. Please try again later.'}
    }
}

export const consultant = async(req, res) => {
    const {username, first_name, last_name, email, password} = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { rows: existingUsers } = await pool.query('SELECT * FROM users WHERE email = $1 AND role = \'consultant\'', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already exists' });
        }

    const user = {username, first_name, last_name, email, password};

    try {
        const response = await registerConsultant(user);
        if(response.success){
            // Log activity for consultant registration
            await logActivity(response.user.id, 'consultant', 'register', 'Consultant registered');
            return res.status(200).json(response); 
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return {success: false, message: 'Registration failed. Please try again later.'}
    }
}

export const login = async(req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const response = await loginUser(email, password);
        if(response.success){
            // Issue access and refresh tokens
            const accessToken = jwt.sign(
                { id: response.user.id, email: response.user.email, role: response.user.role },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            const refreshToken = jwt.sign(
                { id: response.user.id, email: response.user.email, role: response.user.role },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );
            // Store refresh token in DB
            await storeRefreshToken(response.user.id, refreshToken);
            // Log activity for login
            await logActivity(response.user.id, response.user.role, 'login', 'User logged in');
            return res.status(200).json({ ...response, accessToken, refreshToken }); 
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: 'Login failed. Please try again later.' });
    }
}

// Refresh token endpoint (for completeness, but main logic is in middleware/auth.js)
export const refresh = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(401).json({ success: false, message: 'Refresh token required' });
    }
    try {
        // Check if refresh token exists in DB
        const found = await findRefreshToken(refreshToken);
        if (!found) {
            return res.status(403).json({ success: false, message: 'Refresh token not found or revoked' });
        }
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const newAccessToken = jwt.sign(
            { id: decoded.id, email: decoded.email, role: decoded.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        res.json({ accessToken: newAccessToken });
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }
};

// Logout endpoint to revoke refresh token
export const logout = async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
    }
    try {
        await revokeRefreshToken(refreshToken);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
};

export const changePassword = async (req, res) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { currentPassword, newPassword } = req.body;
    if (!userId || !role) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    }
    const result = await changePasswordForAnyRole(userId, role, currentPassword, newPassword);
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
};

export const savePushToken = async (req, res) => {
    try {
        const { authId, pushToken } = req.body;
        if (!authId || !pushToken) {
        return res.status(400).json({ error: 'authId and pushToken are required' });
        }
        await saveAuthPushToken(authId, pushToken);
        res.status(200).json({ message: 'Push token saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendPushNotification = async (req, res) => {
    try {
        const { authId, title, body, data } = req.body;
        if (!authId || !title || !body) {
        return res.status(400).json({ error: 'authId, title, and body are required' });
        }
        const result = await sendPushNotificationToAuth(authId, title, body, data);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

