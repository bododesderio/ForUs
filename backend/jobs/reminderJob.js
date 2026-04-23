import cron from 'node-cron';
import { getUpcomingAppointments } from '../services/AppointmentServices.js';
import { sendPushNotificationToUser, sendPushNotificationToConsultant, saveNotification } from '../services/UserServices.js';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
    try {
        // Get appointments starting in the next 15 minutes
        const appointments = await getUpcomingAppointments(15); // implement this in AppointmentServices.js
        for (const appt of appointments) {
            // Send reminder to user
            await sendPushNotificationToUser(
                appt.user_id,
                'Appointment Reminder',
                `Your appointment with ${appt.consultant_name} starts at ${appt.appointment_datetime}`,
                { appointmentId: appt.id }
            );
            await saveNotification({
                userId: appt.user_id,
                consultantId: appt.consultant_id,
                title: 'Appointment Reminder',
                body: `Your appointment with ${appt.consultant_name} starts at ${appt.appointment_datetime}`,
                data: { appointmentId: appt.id }
            });
            // Send reminder to consultant
            await sendPushNotificationToConsultant(
                appt.consultant_id,
                'Appointment Reminder',
                `You have an appointment with ${appt.user_name} at ${appt.appointment_datetime}`,
                { appointmentId: appt.id }
            );
            await saveNotification({
                userId: appt.user_id,
                consultantId: appt.consultant_id,
                title: 'Appointment Reminder',
                body: `You have an appointment with ${appt.user_name} at ${appt.appointment_datetime}`,
                data: { appointmentId: appt.id }
            });
        }
        console.log(`[ReminderJob] Sent reminders for ${appointments.length} appointments.`);
    } catch (error) {
        console.error('[ReminderJob] Error sending reminders:', error);
    }
});
