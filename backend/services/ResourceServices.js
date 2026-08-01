/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pool } from "../db/index.js";

export const createResource = async (resource) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO resources
            (consultant_id, title, description, category, type, file_url, preview_image_url, author, duration)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
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
        return { success: true, id: rows[0].id };
    } catch (error) {
        console.error('Error creating resource:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const getResources = async (filters = {}) => {
    try {
        let paramIdx = 1;
        let query = 'SELECT * FROM resources WHERE deleted_at IS NULL';
        const params = [];
        if (filters.type) {
            query += ` AND type = $${paramIdx++}`;
            params.push(filters.type);
        }
        if (filters.category) {
            query += ` AND category = $${paramIdx++}`;
            params.push(filters.category);
        }
        query += ' ORDER BY created_at DESC';
        const { rows: resources } = await pool.query(query, params);
        return { success: true, resources };
    } catch (error) {
        console.error('Error fetching resources:', error);
        return { success: false, message: 'Internal server error' };
    }
};
