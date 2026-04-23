import { createResource, getResources } from '../services/ResourceServices.js';

export const uploadResource = async (req, res) => {
    try {
        const { title, description, category, type, file_url, preview_image_url, author, duration } = req.body;
        if (!title || !type || !file_url) {
            return res.status(400).json({ success: false, message: 'Title, type, and file_url are required.' });
        }
        const resource = {
            consultant_id: req.user.id,
            title,
            description,
            category,
            type,
            file_url,
            preview_image_url,
            author,
            duration
        };
        const result = await createResource(resource);
        if (result.success) {
            return res.status(201).json({ success: true, id: result.id });
        } else {
            return res.status(500).json(result);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to upload resource.' });
    }
};

export const fetchResources = async (req, res) => {
    try {
        const filters = req.query;
        const result = await getResources(filters);
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(500).json(result);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch resources.' });
    }
};
