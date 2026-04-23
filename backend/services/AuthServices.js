import { pool } from "../db/index.js"
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendPushNotificationAsync } from './NotificationService.js';

export const registerUser = async(user) => {
    try {
        const hashedPassword = await bcrypt.hash(user.password, 10);

        const query = `INSERT INTO users (username, email, password, profile_image) VALUES (?,?,?,?)`;
        const values = [user.username, user.email, hashedPassword, user.profile_image || null];

        const [result] = await pool.query(query, values);
        const userId = result.insertId;
        const role = 'user';
        
        const response = {
            success: true, 
            message: 'User Registered Successfully.',
            user: {
                id: userId,
                email: user.email,
                username: user.username,
                role,
                profile_image: user.profile_image
            }
        };
        return response;
        
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return { success: false, message: 'Email already exists' };
        }
        
        return { 
            success: false, 
            message: 'Registration failed: ' + error.message 
        };
    }
};

export const registerConsultant = async(user) => {
    try {
        const hashedPassword = await bcrypt.hash(user.password, 10)
        const query = `INSERT INTO consultants (username, first_name, last_name, email, password) VALUES (?,?,?,?,?)`
        const values = [user.username, user.first_name, user.last_name, user.email, hashedPassword];

        await pool.query(query, values);
        return {success: true, message: 'Consultant Registered Successfully.'}
    } catch (error) {
        return {success: false, message: 'Registration failed.'}
    }
}

export const loginUser = async(email, password) => { 
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        let user = null;
        let role = null;

        if(users && users.length > 0) {
            user = users[0];
            role = user.role;
        }else {
            const [admins] = await pool.query('SELECT * FROM admin WHERE email = ?', [email]);

            if(admins && admins.length > 0) {
                user = admins[0];
                role = user.role;
            } else{
                const [consultants] = await pool.query(`
                    SELECT 
                        c.*,
                        COUNT(r.id) as total_reviews,
                        ROUND(AVG(r.rating), 2) as average_rating,
                        MAX(r.created_at) as latest_review_date
                    FROM consultants c
                    LEFT JOIN reviews r ON c.id = r.consultant_id
                    WHERE c.email = ?
                    GROUP BY c.id
                `, [email]);
                
                if(consultants && consultants.length > 0){
                    user = consultants[0];
                    role = user.role;
                }
            }
        }

        if (!user || user.length === 0) {
            return {success: false, message: "User or admin does not exists."};
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return {success: false, message: "Invalid credentials."};
        }

        // Never return password hash to client
        delete user.password;

        return {
            success: true,
            message: 'Login Successful',
            user
        };
    } catch (error) {
        return {success: false, message: "Login failed. Please try again later."};
    }
}

// Store refresh token in DB
export const storeRefreshToken = async (userId, refreshToken) => {
    // Create table if not exists: CREATE TABLE refresh_tokens (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, token VARCHAR(512), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)
    await pool.query('INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)', [userId, refreshToken]);
};

// Remove refresh token from DB (logout/revoke)
export const revokeRefreshToken = async (refreshToken) => {
    await pool.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
};

// Find refresh token in DB
export const findRefreshToken = async (refreshToken) => {
    const [rows] = await pool.query('SELECT * FROM refresh_tokens WHERE token = ?', [refreshToken]);
    return rows.length > 0;
};

// Change password for users, admins, and consultants
export const changePasswordForAnyRole = async (userId, role, currentPassword, newPassword) => {
    let table = null;
    if (role === 'user') table = 'users';
    else if (role === 'admin') table = 'admin';
    else if (role === 'consultant') table = 'consultants';
    else return { success: false, message: 'Invalid role.' };

    try {
        // Get user/admin/consultant by ID
        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [userId]);
        if (!rows || rows.length === 0) {
            return { success: false, message: 'Account not found.' };
        }
        const user = rows[0];
        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return { success: false, message: 'Current password is incorrect.' };
        }
        // Hash new password and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashedPassword, userId]);
        return { success: true, message: 'Password changed successfully.' };
    } catch (error) {
        return { success: false, message: 'Password change failed.' };
    }
};

export const saveAuthPushToken = async (authId, pushToken) => {
    const query = 'UPDATE admin SET push_token = ? WHERE id = ?';
    await pool.query(query, [pushToken, authId]);
};

export const sendPushNotificationToAuth = async (authId, title, body, data) => {
    const [rows] = await pool.query('SELECT push_token FROM admin WHERE id = ?', [authId]);
    if (!rows.length || !rows[0].push_token) {
        throw new Error('Admin push token not found');
    }
    return await sendPushNotificationAsync(rows[0].push_token, title, body, data);
};
