/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
import { pool } from "../db/index.js";
import { sendPushNotificationToUser, sendPushNotificationToConsultant } from './UserServices.js';

// Cancel all expired appointments (pending/confirmed) whose start time is more than 15 minutes in the past
export const cancelExpiredAppointments = async () => {
    try {
        const { rows: appointments } = await pool.query(
            `SELECT id, appointment_datetime, user_id, consultant_id FROM appointments
             WHERE status IN ('pending', 'confirmed')`
        );
        const now = new Date();
        const expiredIds = [];
        const expiredAppointments = [];
        for (const appt of appointments) {
            const apptStart = new Date(appt.appointment_datetime);
            if (!isNaN(apptStart.getTime())) {
                if (now > new Date(apptStart.getTime() + 15 * 60000)) {
                    expiredIds.push(appt.id);
                    expiredAppointments.push(appt);
                }
            }
        }
        if (expiredIds.length > 0) {
            const placeholders = expiredIds.map((_, i) => `$${i + 1}`).join(',');
            await pool.query(
                `UPDATE appointments SET status = 'cancelled', cancellation_reason = 'Missed/Expired', updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
                expiredIds
            );
            for (const appt of expiredAppointments) {
                try {
                    await sendPushNotificationToUser(
                        appt.user_id,
                        'Appointment Cancelled',
                        `Your appointment scheduled for ${appt.appointment_datetime} was cancelled due to no-show/expiry.`,
                        { appointmentId: appt.id }
                    );
                    await sendPushNotificationToConsultant(
                        appt.consultant_id,
                        'Appointment Cancelled',
                        `An appointment scheduled for ${appt.appointment_datetime} was cancelled due to no-show/expiry.`,
                        { appointmentId: appt.id }
                    );
                } catch (notifyErr) {
                    console.error('Notification error (auto-cancel):', notifyErr);
                }
            }
            console.log('Cancelled appointment IDs:', expiredIds);
        }
        return { success: true, cancelled: expiredIds.length };
    } catch (error) {
        console.error('Error cancelling expired appointments:', error);
        return { success: false, message: "Internal server error" };
    }
};

export const createAppointment = async(appointment, user_id) => {
    try {
        // Verify consultant exists (user with role='consultant')
        const { rows: consultants } = await pool.query(
            `SELECT u.id FROM users u
             INNER JOIN consultant_details cd ON cd.user_id = u.id
             WHERE u.id = $1 AND u.role = 'consultant' AND u.deleted_at IS NULL`,
            [appointment.consultant_id]
        );
        if (consultants.length === 0) {
            return {success: false, message: "Consultant not found or inactive"};
        }

        const durationInMinutes = appointment.duration_minutes || 90;
        const appointmentDateTime = new Date(appointment.appointment_datetime);
        if (isNaN(appointmentDateTime.getTime())) {
            return {success: false, message: "Invalid appointment_datetime"};
        }
        const appointmentDateTimeStr = appointmentDateTime.toISOString();

        const { rows: conflicts } = await pool.query(
            `SELECT id FROM appointments
            WHERE consultant_id = $1
            AND status IN ('pending', 'confirmed', 'in_session')
            AND (
                (appointment_datetime <= $2 AND appointment_datetime + (duration_minutes || ' minutes')::interval > $3)
                OR
                (appointment_datetime < $4 AND appointment_datetime + (duration_minutes || ' minutes')::interval >= $5)
            )`,
            [
                appointment.consultant_id,
                appointmentDateTimeStr,
                appointmentDateTimeStr,
                appointmentDateTimeStr,
                appointmentDateTimeStr
            ]
        );

        if (conflicts.length > 0) {
            return {success: false, message: "Time slot is already booked"};
        }

        const { rows } = await pool.query(
            `INSERT INTO appointments (user_id, consultant_id, title, description, appointment_datetime, duration_minutes, status, mood)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) RETURNING id`,
            [
                user_id,
                appointment.consultant_id,
                appointment.title,
                appointment.description || null,
                appointmentDateTimeStr,
                durationInMinutes,
                appointment.mood || null
            ]
        );

        return {
            success: true,
            message: 'Appointment created successfully',
            appointment: {
                id: rows[0].id,
                ...appointment,
                user_id,
                status: 'pending',
                duration_minutes: durationInMinutes,
                appointment_datetime: appointmentDateTimeStr
            }
        }

    } catch (error) {
        console.error('Error creating appointment:', error);
        return {
            success: false,
            message: "Cannot create an appointment."
        }
    }
}

export const getAppointments = async (userId, userType, appointment = {}) => {
    try {
        await cancelExpiredAppointments();

        let query, countQuery;
        let params = [];
        let countParams = [];
        let paramIdx = 1;
        let countParamIdx = 1;

        if (userType === 'user') {
            query = `
                SELECT
                    a.*,
                    CONCAT(p.first_name, ' ', p.last_name) as consultant_name,
                    u2.email as consultant_email,
                    p.phone as consultant_phone,
                    p.profile_image,
                    p.dob,
                    p.gender,
                    r.id as review_id,
                    r.rating,
                    r.review_text,
                    r.created_at as review_date
                FROM appointments a
                LEFT JOIN users u2 ON a.consultant_id = u2.id
                LEFT JOIN profiles p ON p.user_id = u2.id
                LEFT JOIN reviews r ON a.id = r.appointment_id
                WHERE a.user_id = $${paramIdx}
            `;
            countQuery = `
                SELECT COUNT(DISTINCT a.id) as total
                FROM appointments a
                LEFT JOIN reviews r ON a.id = r.appointment_id
                WHERE a.user_id = $${countParamIdx}
            `;
            params.push(userId);
            countParams.push(userId);
            paramIdx++;
            countParamIdx++;
        } else if (userType === 'consultant') {
            query = `
                SELECT
                    a.*,
                    CONCAT(p.first_name, ' ', p.last_name) as user_name,
                    u2.email as user_email,
                    p.phone as user_phone,
                    p.profile_image,
                    p.dob,
                    p.gender,
                    r.id as review_id,
                    r.rating,
                    r.review_text,
                    r.created_at as review_date
                FROM appointments a
                LEFT JOIN users u2 ON a.user_id = u2.id
                LEFT JOIN profiles p ON p.user_id = u2.id
                LEFT JOIN reviews r ON a.id = r.appointment_id
                WHERE a.consultant_id = $${paramIdx}
            `;
            countQuery = `
                SELECT COUNT(DISTINCT a.id) as total
                FROM appointments a
                LEFT JOIN reviews r ON a.id = r.appointment_id
                WHERE a.consultant_id = $${countParamIdx}
            `;
            params.push(userId);
            countParams.push(userId);
            paramIdx++;
            countParamIdx++;
        } else if (userType === 'admin') {
            query = `
                SELECT
                    a.*,
                    CONCAT(pu.first_name, ' ', pu.last_name) as user_name,
                    uu.email as user_email,
                    pu.phone as user_phone,
                    pu.profile_image as user_profile_image,
                    pu.dob as user_dob,
                    pu.gender as user_gender,
                    CONCAT(pc.first_name, ' ', pc.last_name) as consultant_name,
                    uc.email as consultant_email,
                    pc.phone as consultant_phone,
                    pc.profile_image as consultant_profile_image,
                    pc.dob as consultant_dob,
                    pc.gender as consultant_gender,
                    r.id as review_id,
                    r.rating,
                    r.review_text,
                    r.created_at as review_date
                FROM appointments a
                LEFT JOIN users uu ON a.user_id = uu.id
                LEFT JOIN profiles pu ON pu.user_id = uu.id
                LEFT JOIN users uc ON a.consultant_id = uc.id
                LEFT JOIN profiles pc ON pc.user_id = uc.id
                LEFT JOIN reviews r ON a.id = r.appointment_id
            `;
            countQuery = `
                SELECT COUNT(DISTINCT a.id) as total
                FROM appointments a
                LEFT JOIN reviews r ON a.id = r.appointment_id
            `;
        }

        // Apply filters
        const hasBaseWhere = userType !== 'admin';

        if (appointment.status) {
            const statuses = appointment.status.split(',').map(s => s.trim());
            const statusPlaceholders = statuses.map(() => `$${paramIdx++}`).join(',');
            const countStatusPlaceholders = statuses.map(() => `$${countParamIdx++}`).join(',');
            query += ` ${hasBaseWhere ? 'AND' : 'WHERE'} a.status IN (${statusPlaceholders})`;
            countQuery += ` ${hasBaseWhere ? 'AND' : 'WHERE'} a.status IN (${countStatusPlaceholders})`;
            params.push(...statuses);
            countParams.push(...statuses);
        }

        const hasWhere = hasBaseWhere || !!appointment.status;

        if (appointment.date_from) {
            query += ` ${hasWhere ? 'AND' : 'WHERE'} a.appointment_datetime >= $${paramIdx++}`;
            countQuery += ` ${hasWhere ? 'AND' : 'WHERE'} a.appointment_datetime >= $${countParamIdx++}`;
            params.push(appointment.date_from);
            countParams.push(appointment.date_from);
        }

        if (appointment.date_to) {
            query += ` AND a.appointment_datetime <= $${paramIdx++}`;
            countQuery += ` AND a.appointment_datetime <= $${countParamIdx++}`;
            params.push(appointment.date_to);
            countParams.push(appointment.date_to);
        }

        if (appointment.date) {
            query += ` ${hasWhere || appointment.date_from || appointment.date_to ? 'AND' : 'WHERE'} a.appointment_datetime::date = $${paramIdx++}`;
            countQuery += ` ${hasWhere || appointment.date_from || appointment.date_to ? 'AND' : 'WHERE'} a.appointment_datetime::date = $${countParamIdx++}`;
            params.push(appointment.date);
            countParams.push(appointment.date);
        }

        if (appointment.reviewed === 'true') {
            query += ` AND r.id IS NOT NULL`;
            countQuery += ` AND r.id IS NOT NULL`;
        } else if (appointment.reviewed === 'false') {
            query += ` AND r.id IS NULL`;
            countQuery += ` AND r.id IS NULL`;
        }

        query += ' ORDER BY a.appointment_datetime DESC';

        const page = parseInt(appointment.page) || 1;
        const limit = userType === 'admin' ? parseInt(appointment.limit) || 100 : parseInt(appointment.limit) || 10;
        const offset = (page - 1) * limit;

        query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
        params.push(limit, offset);

        const { rows: appointments } = await pool.query(query, params);

        let total = 0;
        if (appointment.include_total === 'true' || userType === 'admin') {
            const { rows: countResult } = await pool.query(countQuery, countParams);
            total = parseInt(countResult[0].total);
        }

        return {
            success: true,
            message: "Appointments fetched successfully.",
            appointments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        };
    } catch (error) {
        console.error('Database error:', error);
        return {
            success: false,
            message: "Internal server Error"
        }
    }
};

export const getConsultantAvailability = async (consultantId, dateFrom, dateTo) => {
    try {
        const { rows: appointments } = await pool.query(
            `SELECT appointment_datetime, status
            FROM appointments
            WHERE consultant_id = $1
            AND appointment_datetime BETWEEN $2 AND $3
            AND status IN ('confirmed', 'pending', 'in_session')
            ORDER BY appointment_datetime ASC`,
            [consultantId, dateFrom, dateTo]
        );

        return {
            success: true,
            message: "Availability fetched successfully.",
            appointments
        }
    } catch (error) {
        console.error('Database error:', error);
        return {success: false, message: "Internal server error"}
    }
}

export const updateStatus = async(userId, userType, appointmentId, statusUpdate) => {
    try {
        const { rows: appointments } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (appointments.length === 0) {
            return {success: false, message: "Appointment not found"};
        }

        const appointment = appointments[0];

        if (userType === 'consultant' && appointment.consultant_id !== userId) {
            return {success: false, message: "Not authorized to update this appointment"};
        }

        if (userType === 'user' && appointment.user_id !== userId) {
            return {success: false, message: "Not authorized to update this appointment"};
        }

        if (userType === 'user' && !['cancelled', 'in_session'].includes(statusUpdate.status)) {
            return {success: false, message: "Users can only cancel appointments or start sessions"};
        }

        const validStatuses = ['pending', 'confirmed', 'in_session', 'cancelled', 'completed', 'rejected'];
        if (!validStatuses.includes(statusUpdate.status)) {
            return {success: false, message: "Invalid status"};
        }

        await pool.query(
            'UPDATE appointments SET status = $1, cancellation_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [statusUpdate.status, statusUpdate.cancellation_reason || null, appointmentId]
        );

        return {
            success: true,
            message: "Appointment status updated successfully"
        };
    } catch (error) {
        console.error('Error updating appointment status:', error);
        return {success: false, message: "Internal server error"}
    }
}

export const consultantReview = async(userId, consultantId, review) => {
    try {
        // Verify consultant exists
        const { rows: consultants } = await pool.query(
            `SELECT u.id FROM users u
             INNER JOIN consultant_details cd ON cd.user_id = u.id
             WHERE u.id = $1 AND u.role = 'consultant'`,
            [consultantId]
        );

        if (consultants.length === 0) {
            return {success: false, message: "Consultant not found"};
        }

        const { rows: existingReviews } = await pool.query(
            'SELECT id FROM reviews WHERE consultant_id = $1 AND user_id = $2',
            [consultantId, userId]
        );

        if (existingReviews.length > 0) {
            return {success: false, message: "Review already exists for this consultant"};
        }

        const { rows: completedAppointments } = await pool.query(
            `SELECT id FROM appointments WHERE user_id = $1 AND consultant_id = $2 AND status = 'completed'`,
            [userId, consultantId]
        );

        if (completedAppointments.length === 0) {
            return {success: false, message: "You must have a completed appointment with this consultant to leave a review"};
        }

        await pool.query(
            'INSERT INTO reviews (appointment_id, consultant_id, user_id, rating, review_text) VALUES ($1, $2, $3, $4, $5)',
            [completedAppointments[0].id, consultantId, userId, review.rating, review.review_text || null]
        );

        // Update consultant's average rating in consultant_details
        const { rows: ratingData } = await pool.query(
            'SELECT AVG(rating) as avg_rating FROM reviews WHERE consultant_id = $1',
            [consultantId]
        );

        await pool.query(
            'UPDATE consultant_details SET rating = $1 WHERE user_id = $2',
            [parseFloat(ratingData[0].avg_rating).toFixed(2), consultantId]
        );

        return {
            success: true,
            message: "Review added successfully"
        }
    } catch (error) {
        console.error('Error in consultantReview:', error);
        return {
            success: false,
            message: "Internal server error"
        }
    }
}

export const fetchConsultantReviewsPaginated = async (consultantId, page, limit, sortBy, sortOrder) => {
    const ALLOWED_SORT_FIELDS = ['created_at', 'rating'];
    const ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = ALLOWED_SORT_ORDERS.includes((sortOrder || '').toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    try {
        // Verify consultant exists
        const { rows: consultantCheck } = await pool.query(
            `SELECT u.id, p.first_name, p.last_name FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.id = $1 AND u.role = 'consultant'`,
            [consultantId]
        );

        if (consultantCheck.length === 0) {
            return {
                success: false,
                message: "Consultant not found"
            };
        }

        const offset = (page - 1) * limit;

        const { rows: totalCount } = await pool.query(
            'SELECT COUNT(*) as total FROM reviews WHERE consultant_id = $1',
            [consultantId]
        );

        const total = parseInt(totalCount[0].total);
        const totalPages = Math.ceil(total / limit);

        const { rows: reviews } = await pool.query(`
            SELECT
                r.id,
                r.rating,
                r.review_text,
                r.created_at,
                p.first_name as user_first_name,
                p.last_name as user_last_name,
                CONCAT(p.first_name, ' ', p.last_name) as user_name,
                p.profile_image as user_profile_image
            FROM reviews r
            JOIN profiles p ON r.user_id = p.user_id
            WHERE r.consultant_id = $1
            ORDER BY r.${safeSortBy} ${safeSortOrder}
            LIMIT $2 OFFSET $3
        `, [consultantId, limit, offset]);

        const { rows: avgRating } = await pool.query(
            'SELECT AVG(rating) as avg_rating FROM reviews WHERE consultant_id = $1',
            [consultantId]
        );

        return {
            success: true,
            reviews: reviews.map(review => ({
                id: review.id,
                rating: review.rating,
                review_text: review.review_text,
                created_at: review.created_at,
                user_name: review.user_name,
                user_profile_image: review.user_profile_image
            })),
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_reviews: total,
                reviews_per_page: limit,
                has_next: page < totalPages,
                has_previous: page > 1
            },
            statistics: {
                average_rating: avgRating[0].avg_rating ? parseFloat(avgRating[0].avg_rating).toFixed(2) : 0
            }
        };
    } catch (error) {
        console.error('Error in fetchConsultantReviewsPaginated:', error);
        return {
            success: false,
            message: "Internal server error"
        };
    }
}

export const blockAppointmentSlot = async ({ consultant_id, appointment_datetime, duration_minutes = 90 }) => {
    try {
        const { rows: conflicts } = await pool.query(
            `SELECT id FROM appointments WHERE consultant_id = $1 AND appointment_datetime = $2 AND status = 'blocked'`,
            [consultant_id, appointment_datetime]
        );
        if (conflicts.length > 0) {
            return { success: false, message: 'Slot already blocked' };
        }
        await pool.query(
            `INSERT INTO appointments (consultant_id, appointment_datetime, duration_minutes, status) VALUES ($1, $2, $3, 'blocked')`,
            [consultant_id, appointment_datetime, duration_minutes]
        );
        return { success: true };
    } catch (error) {
        console.error('Error blocking slot:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const confirmAppointment = async (consultantId, appointmentId) => {
    try {
        const { rows: appointments } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (appointments.length === 0) {
            return { success: false, message: 'Appointment not found' };
        }
        const appointment = appointments[0];
        if (appointment.consultant_id !== consultantId) {
            return { success: false, message: 'Not authorized to confirm this appointment' };
        }
        if (appointment.status !== 'pending') {
            return { success: false, message: 'Only pending appointments can be confirmed' };
        }
        await pool.query(
            `UPDATE appointments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [appointmentId]
        );
        return { success: true, message: 'Appointment confirmed' };
    } catch (error) {
        console.error('Error confirming appointment:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const rejectAppointment = async (consultantId, appointmentId) => {
    try {
        const { rows: appointments } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (appointments.length === 0) {
            return { success: false, message: 'Appointment not found' };
        }
        const appointment = appointments[0];
        if (appointment.consultant_id !== consultantId) {
            return { success: false, message: 'Not authorized to reject this appointment' };
        }
        if (appointment.status !== 'pending') {
            return { success: false, message: 'Only pending appointments can be rejected' };
        }
        await pool.query(
            `UPDATE appointments SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [appointmentId]
        );
        return { success: true, message: 'Appointment rejected' };
    } catch (error) {
        console.error('Error rejecting appointment:', error);
        return { success: false, message: 'Internal server error' };
    }
};

export const rescheduleAppointment = async (userId, userType, appointmentId, newDateTime) => {
    try {
        const { rows: appointments } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
        if (appointments.length === 0) {
            return { success: false, message: "Appointment not found" };
        }
        const appointment = appointments[0];
        if (
            (userType === 'consultant' && appointment.consultant_id !== userId) ||
            (userType === 'user' && appointment.user_id !== userId)
        ) {
            return { success: false, message: "Not authorized to reschedule this appointment" };
        }
        const { rows: conflicts } = await pool.query(
            `SELECT id FROM appointments
             WHERE consultant_id = $1
             AND id != $2
             AND status IN ('pending', 'confirmed', 'in_session')
             AND (
                (appointment_datetime <= $3 AND appointment_datetime + (duration_minutes || ' minutes')::interval > $4)
                OR
                (appointment_datetime < $5 AND appointment_datetime + (duration_minutes || ' minutes')::interval >= $6)
             )`,
            [
                appointment.consultant_id,
                appointmentId,
                newDateTime, newDateTime,
                newDateTime, newDateTime
            ]
        );
        if (conflicts.length > 0) {
            return { success: false, message: "Time slot is already booked" };
        }
        await pool.query(
            'UPDATE appointments SET appointment_datetime = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            [newDateTime, 'pending', appointmentId]
        );
        return { success: true, message: "Appointment rescheduled successfully" };
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        return { success: false, message: "Internal server error" };
    }
};

export const getUpcomingAppointments = async (minutesAhead = 15) => {
    try {
        const now = new Date();
        const future = new Date(now.getTime() + minutesAhead * 60000);
        const { rows: appointments } = await pool.query(
            `SELECT a.id, a.user_id, a.consultant_id, a.appointment_datetime,
                    CONCAT(pu.first_name, ' ', pu.last_name) as user_name,
                    CONCAT(pc.first_name, ' ', pc.last_name) as consultant_name
                FROM appointments a
                JOIN profiles pu ON a.user_id = pu.user_id
                JOIN profiles pc ON a.consultant_id = pc.user_id
                WHERE a.status IN ('pending', 'confirmed')
                AND a.appointment_datetime > $1 AND a.appointment_datetime <= $2`,
            [now.toISOString(), future.toISOString()]
        );
        return appointments;
    } catch (error) {
        console.error('Error fetching upcoming appointments:', error);
        return [];
    }
};
