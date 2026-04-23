import { pool } from "../db/index.js";

export const createResource = async (resource) => {
    try {
        const [result] = await pool.query(
            `INSERT INTO resources 
            (consultant_id, title, description, category, type, file_url, preview_image_url, author, duration) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                resource.consultant_id,
                resource.title,
                resource.description,
                resource.category,
                resource.type,
                resource.file_url,
                resource.preview_image_url,
                resource.author,
                resource.duration
            ]
        );
        return { success: true, id: result.insertId };
    } catch (error) {
        console.error('Error creating resource:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const getResources = async (filters = {}) => {
    try {
        let query = 'SELECT * FROM resources WHERE 1=1';
        const params = [];
        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }
        if (filters.category) {
            query += ' AND category = ?';
            params.push(filters.category);
        }
        query += ' ORDER BY upload_date DESC';
        const [resources] = await pool.query(query, params);
        return { success: true, resources };
    } catch (error) {
        console.error('Error fetching resources:', error);
        return { success: false, message: 'Internal server error' };
    }
};
