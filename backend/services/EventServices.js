/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pool } from "../db/index.js";

export const createEvent = async(eventData) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO events (title, description, event_date, location, organizer)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [eventData.title, eventData.description, eventData.event_date, eventData.location, eventData.organizer]
        );
        return {
            success: true,
            message: "Event created successfully",
            id: rows[0].id
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
        let paramIdx = 1;
        let query = 'SELECT * FROM events WHERE 1=1';
        const params = [];

        if (eventData.date_from) {
            query += ` AND event_date >= $${paramIdx++}`;
            params.push(eventData.date_from);
        }

        if (eventData.date_to) {
            query += ` AND event_date <= $${paramIdx++}`;
            params.push(eventData.date_to);
        }

        if (eventData.location) {
            query += ` AND location ILIKE $${paramIdx++}`;
            params.push(`%${eventData.location}%`);
        }

        query += ' ORDER BY event_date ASC';

        const offset = (eventData.page - 1) * eventData.limit;
        query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(parseInt(eventData.limit), parseInt(offset));

        const { rows: events } = await pool.query(query, params);

        // Count query with same filters (without LIMIT/OFFSET)
        let countParamIdx = 1;
        let countQuery = 'SELECT COUNT(*) as total FROM events WHERE 1=1';
        const countParams = [];

        if (eventData.date_from) {
            countQuery += ` AND event_date >= $${countParamIdx++}`;
            countParams.push(eventData.date_from);
        }

        if (eventData.date_to) {
            countQuery += ` AND event_date <= $${countParamIdx++}`;
            countParams.push(eventData.date_to);
        }

        if (eventData.location) {
            countQuery += ` AND location ILIKE $${countParamIdx++}`;
            countParams.push(`%${eventData.location}%`);
        }

        const { rows: countResult } = await pool.query(countQuery, countParams);
        const total = parseInt(countResult[0].total);

        return {
            success: true,
            message: "Events fetched successfully",
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

export const getDetail = async(eventId) => {
    try {
        const { rows: events } = await pool.query(
            'SELECT * FROM events WHERE id = $1',
            [eventId]
        );

        if (events.length === 0) {
            return {success: false, message: "Event not found"};
        }

        return {
            success: true,
            message: "Event details fetched successfully",
            event: events[0]
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error"
        };
    }
}

export const deleteEvent = async(eventId) => {
    try {
        const result = await pool.query(
            'DELETE FROM events WHERE id = $1',
            [eventId]
        );

        if (result.rowCount === 0) {
            return {success: false, message: "Event not found"};
        }

        return {
            success: true,
            message: "Event deleted successfully"
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error"
        };
    }
}

export const updateEvent = async(eventId, eventData) => {
    try {
        const { rows: existingEvents } = await pool.query(
            'SELECT * FROM events WHERE id = $1',
            [eventId]
        );

        if (existingEvents.length === 0) {
            return { success: false, message: 'Event not found' };
        }

        await pool.query(
            `UPDATE events
            SET title = $1, description = $2, event_date = $3, location = $4, organizer = $5, updated_at = NOW()
            WHERE id = $6`,
            [eventData.title, eventData.description, eventData.event_date, eventData.location, eventData.organizer, eventId]
        );

        const { rows: updatedEvents } = await pool.query(
            'SELECT * FROM events WHERE id = $1',
            [eventId]
        );

        return {
            success: true,
            message: "Event updated successfully",
            updatedEvent: updatedEvents[0]
        };
    } catch (error) {
        return {
            success: false,
            message: "Internal server error"
        };
    }
}
