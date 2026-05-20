import { createAppointment, getAppointments, updateStatus, consultantReview, getConsultantAvailability, fetchConsultantReviewsPaginated, cancelExpiredAppointments, blockAppointmentSlot, confirmAppointment, rejectAppointment, rescheduleAppointment } from "../services/AppointmentServices.js"
import { logActivity } from "../services/ActivityService.js";
import { pool } from "../db/index.js";
import { sendPushNotificationToUser, sendPushNotificationToConsultant } from "../services/UserServices.js";

export const create = async(req, res) => {
    const { consultant_id, title, description, appointment_datetime, duration_minutes, mood } = req.body;
    const user_id = req.user.id;

    if (req.user.role !== 'user') {
        return res.status(403).json({ error: 'Only users can create appointments' });
    }

    if (!consultant_id || !appointment_datetime) {
        return res.status(400).json({ 
            success: false, 
            message: 'Consultant ID and appointment_datetime are required' 
        });
    }

    const appointment = { 
        consultant_id, 
        title: title || 'Consultation', 
        description, 
        appointment_datetime, 
        duration_minutes,
        mood
    };

    try {
        const response = await createAppointment(appointment, user_id);
        if(response.success){
            await logActivity(req.user.id, req.user.role, 'appointment_create', `Created appointment with consultant ID ${consultant_id}`);
            try {
                await sendPushNotificationToUser(user_id, 'Appointment Booked', `Your appointment with consultant ID ${consultant_id} is scheduled for ${appointment.appointment_datetime}`, { appointmentId: response.appointment.id });
                await sendPushNotificationToConsultant(consultant_id, 'New Appointment', `You have a new appointment with user ID ${user_id} scheduled for ${appointment.appointment_datetime}`, { appointmentId: response.appointment.id });
            } catch (notifyErr) {
                console.error('Notification error (create):', notifyErr);
            }
            return res.status(201).json(response);
        } else {
            return res.status(400).json(response);
        }
    } catch (error) {
        console.error('Error in create appointment controller:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to create an appointment. Please try again later.' 
        });
    }
}

export const get = async(req, res) => {
    const userId = req.user.id;
    const userType = req.user.role;
    const { status, date_from, date_to } = req.body;

    const appointment = { status, date_from, date_to };

    try {
        await cancelExpiredAppointments();
        const response = await getAppointments(userId, userType, appointment);
        if(response.success){
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No appointments found. Please try again later.' });
    }
}

export const getAll = async(req, res) => {
    const userId = req.user.id;
    const userType = req.user.role;
    const appointment = req.query;

    if(userType !== 'admin') {
        console.log('Only Admins')
        return res.status(403).json({ error: 'Only admins are allowed to get all appointments.' });
    }

    try {
        await cancelExpiredAppointments();
        const response = await getAppointments(userId, userType, appointment);
        if(response.success){
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'No appointments found. Please try again later.' });
    }
}

export const getAvailableAppointments = async(req, res) => {
    try {
        const { consultantId } = req.params;
        const { date_from, date_to } = req.query;
        
        if (!date_from || !date_to) {
            return res.status(400).json({
                success: false,
                message: "date_from and date_to are required"
            });
        }
        
        const result = await getConsultantAvailability(consultantId, date_from, date_to);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

export const getUserAppointments = async(req, res) => {
    try {
        const { userId } = req.params;
        const appointment = req.query;
        await cancelExpiredAppointments();
        const result = await getAppointments(userId, 'user', appointment);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

export const getConsultantAppointments = async(req, res) => {
    try {
        const { consultantId } = req.params;
        const appointment = req.query;
        await cancelExpiredAppointments();
        const result = await getAppointments(consultantId, 'consultant', appointment);
        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

export const update = async(req, res) => {
    const appointmentId = req.params.id;
    const { status, cancellation_reason } = req.body;
    const userId = req.user.id;
    const userType = req.user.role;
    const statusUpdate = { status, cancellation_reason };

    try {
        const response = await updateStatus(userId, userType, appointmentId, statusUpdate);
        if(response.success){
            if (status === 'cancelled' || status === 'in_session') {
                const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
                if (rows.length) {
                    const appt = rows[0];
                    try {
                        if (status === 'cancelled') {
                            await sendPushNotificationToUser(appt.user_id, 'Appointment Cancelled', `Your appointment scheduled for ${appt.appointment_datetime} has been cancelled.`, { appointmentId });
                            await sendPushNotificationToConsultant(appt.consultant_id, 'Appointment Cancelled', `An appointment scheduled for ${appt.appointment_datetime} has been cancelled.`, { appointmentId });
                        } else if (status === 'in_session') {
                            await sendPushNotificationToUser(appt.user_id, 'Session Started', `Your appointment with ${appt.consultant_name} is now in session.`, { appointmentId });
                            await sendPushNotificationToConsultant(appt.consultant_id, 'Session Started', `Your appointment with ${appt.user_name} is now in session.`, { appointmentId });
                        }
                    } catch (notifyErr) {
                        console.error('Notification error:', notifyErr);
                    }
                }
            }
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update appointment status. Please try again later.' });
    }
}

export const review = async(req, res) => {
    const consultantId = req.params.id;
    const { rating, review_text } = req.body;
    const userId = req.user.id;

    if (req.user.role !== 'user') {
        return res.status(403).json({ error: 'Only users can leave reviews' });
    }

    const review = { rating, review_text };

    try {
        const response = await consultantReview(userId, consultantId, review);
        if(response.success){
            try {
                await sendPushNotificationToConsultant(
                    consultantId,
                    'New Review Received',
                    'You have received a new review from a patient.',
                    { userId, rating, review_text }
                );
            } catch (notifyErr) {
                console.error('Notification error (review):', notifyErr);
            }
            return res.status(200).json(response);
        }else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to review an appointment. Please try again later.' });
    }
}

export const getConsultantReviewsPaginated = async (req, res) => {
    const consultantId = req.params.consultantId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    if (!consultantId || isNaN(consultantId)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Valid consultant ID is required' 
        });
    }

    if (page < 1 || limit < 1 || limit > 50) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid pagination parameters' 
        });
    }

    const validSortFields = ['created_at', 'rating'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (!validSortFields.includes(sortBy) || !validSortOrders.includes(sortOrder)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid sorting parameters' 
        });
    }

    try {
        const response = await fetchConsultantReviewsPaginated(
            consultantId, 
            page, 
            limit, 
            sortBy, 
            sortOrder
        );
        
        if (response.success) {
            return res.status(200).json(response);
        } else {
            return res.status(404).json(response);
        }
    } catch (error) {
        console.error('Error in getConsultantReviewsPaginated controller:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch consultant reviews. Please try again later.' 
        });
    }
};

export const blockSlot = async (req, res) => {
    if (req.user.role !== 'consultant') {
        return res.status(403).json({ success: false, message: 'Only consultants can block slots' });
    }
    const { appointment_datetime, duration_minutes } = req.body;
    const consultant_id = req.user.id;
    if (!appointment_datetime) {
        return res.status(400).json({ success: false, message: 'appointment_datetime is required' });
    }
    try {
        const result = await blockAppointmentSlot({ consultant_id, appointment_datetime, duration_minutes });
        if (result.success) {
            return res.status(201).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        console.error('Error in blockSlot controller:', error);
        return res.status(500).json({ success: false, message: 'Failed to block slot' });
    }
};

export const confirm = async (req, res) => {
    const appointmentId = req.params.id;
    const consultantId = req.user.id;
    if (req.user.role !== 'consultant') {
        return res.status(403).json({ success: false, message: 'Only consultants can confirm appointments' });
    }
    try {
        const result = await confirmAppointment(consultantId, appointmentId);
        if (result.success) {
            const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
            if (rows.length) {
                const appt = rows[0];
                try {
                    await sendPushNotificationToUser(
                        appt.user_id,
                        'Appointment Confirmed',
                        `Your appointment scheduled for ${appt.appointment_datetime} has been confirmed by the consultant.`,
                        { appointmentId }
                    );
                } catch (notifyErr) {
                    console.error('Notification error (confirm):', notifyErr);
                }
            }
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to confirm appointment.' });
    }
};

export const reject = async (req, res) => {
    const appointmentId = req.params.id;
    const consultantId = req.user.id;
    if (req.user.role !== 'consultant') {
        return res.status(403).json({ success: false, message: 'Only consultants can reject appointments' });
    }
    try {
        const result = await rejectAppointment(consultantId, appointmentId);
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject appointment.' });
    }
};

export const reschedule = async (req, res) => {
    const appointmentId = req.params.id;
    const { new_datetime } = req.body;
    const userId = req.user.id;
    const userType = req.user.role;
    if (!new_datetime) {
        return res.status(400).json({ success: false, message: "New datetime is required" });
    }
    try {
        const result = await rescheduleAppointment(userId, userType, appointmentId, new_datetime);
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to reschedule appointment." });
    }
};

export const cancel = async (req, res) => {
    const appointmentId = req.params.id;
    const { cancellation_reason } = req.body;
    const userId = req.user.id;
    const userType = req.user.role;
    if (!appointmentId) {
        return res.status(400).json({ success: false, message: 'Appointment ID is required' });
    }
    try {
        const statusUpdate = { status: 'cancelled', cancellation_reason };
        const response = await updateStatus(userId, userType, appointmentId, statusUpdate);
        if (response.success) {
            return res.status(200).json(response);
        } else {
            return res.status(400).json(response);
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to cancel appointment. Please try again later.' });
    }
};

export const startSession = async (req, res) => {
    const appointmentId = req.params.id;
    const userId = req.user.id;
    const userType = req.user.role;

    try {
        const statusUpdate = { status: 'in_session' };
        const response = await updateStatus(userId, userType, appointmentId, statusUpdate);
        if (response.success) {
            const { rows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
            if (rows.length) {
                const appt = rows[0];
                try {
                    await sendPushNotificationToUser(
                        appt.user_id,
                        'Session Started',
                        `Your appointment with ${appt.consultant_name} is now in session.`,
                        { appointmentId }
                    );
                    await sendPushNotificationToConsultant(
                        appt.consultant_id,
                        'Session Started',
                        `Your appointment with ${appt.user_name} is now in session.`,
                        { appointmentId }
                    );
                } catch (notifyErr) {
                    console.error('Notification error (start session):', notifyErr);
                }
            }
            return res.status(200).json(response);
        } else {
            return res.status(400).json(response);
        }
    } catch (error) {
        console.error('Error starting session:', error);
        return res.status(500).json({ success: false, message: 'Failed to start session. Please try again later.' });
    }
};
