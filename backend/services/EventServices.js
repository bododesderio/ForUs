import { pool } from "../db/index.js";

export const createEvent = async(eventData) => {
    try {
        const query = `
        INSERT INTO events (title, description, event_date, location, organizer)
        VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(query, [
            eventData.title, eventData.description, eventData.event_date, eventData.location, eventData.organizer
        ]);
        return {
            success: true,
            message: "Event created successfully",
            id: result.insertId
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error."
        };
    }
}

export const getEvents = async (eventData) => {
    try {
        let query = 'SELECT * FROM events WHERE 1=1';
        const params = [];

        if (eventData.date_from) {
            query += ' AND event_date >= ?';
            params.push(eventData.date_from);
        }
        
        if (eventData.date_to) {
            query += ' AND event_date <= ?';
            params.push(eventData.date_to);
        }
        
        if (eventData.location) {
            query += ' AND location LIKE ?';
            params.push(`%${eventData.location}%`);
        }
        
        query += ' ORDER BY event_date ASC';

        const offset = (eventData.page - 1) * eventData.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(eventData.limit), parseInt(offset));
        
        const [events] = await pool.query(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM events WHERE 1=1';
        const countParams = [];
        
        if (eventData.date_from) {
            countQuery += ' AND event_date >= ?';
            countParams.push(eventData.date_from);
        }
        
        if (eventData.date_to) {
            countQuery += ' AND event_date <= ?';
            countParams.push(eventData.date_to);
        }
        
        if (eventData.location) {
            countQuery += ' AND location LIKE ?';
            countParams.push(`%${eventData.location}%`);
        }

        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;
        
        return {
            success: true,
            message: "Ëvents fetched successfully",
            events,
            pagination: {
                page: parseInt(eventData.page),
                limit: parseInt(eventData.limit),
                total,
                pages: Math.ceil(total / eventData.limit)
            }
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error"
        };
    }
}

export const getDetail = async(userId) => {
    try {
        const [events] = await pool.query(
            'SELECT * FROM events WHERE id = ?',
            [userId]
        );

        if (events.length === 0) {
            return {success: false, message: "Event not found"};
        }

        const event = events[0];

        return {
            success: true,
            message: "Event details fetched successfully",
            event
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error",
            error
        };
    }
}

export const deleteEvent = async(userId) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM events WHERE id = ?',
            [userId]
        );
        
        if (result.affectedRows === 0) {
            return {success: false, message: "Event not found"};
        }

        return {
            success: true,
            message: "Event deleted successfully"
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error",
            error
        };
    }
}

export const updateEvent = async(userId, eventData) => {
    try {
        const [existingEvents] = await pool.query(
            'SELECT * FROM events WHERE id = ?',
            [userId]
        );
        
        if (existingEvents.length === 0) {
            return { error: 'Event not found' }
        }

        await pool.query(
            `UPDATE events 
            SET title = ?, description = ?, event_date = ?, location = ?, organizer = ?
            WHERE id = ?`,
            [eventData.title, eventData.description, eventData.event_date, eventData.location, eventData.organizer, userId]
        );
        
        const [updatedEvents] = await pool.query(
            'SELECT * FROM events WHERE id = ?',
            [userId]
        );

        const updatedEvent = updatedEvents[0];

        return {
            success: true,
            message: "Event deleted successfully",
            updatedEvent
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error",
            error
        };
    }
}
