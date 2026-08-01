# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Celery tasks for the appointment lifecycle (R6), replacing the Node node-cron jobs.

- send_appointment_reminders: 15-min-ahead reminders — one notification per recipient
  (BUG-5: the Node job passed the wrong payload and double-saved with a null recipient_id).
- cancel_expired_appointments_task: the scheduled counterpart to the on-read auto-cancel.
Beat schedules live in settings.CELERY_BEAT_SCHEDULE.
"""
from __future__ import annotations

from celery import shared_task

from accounts.models import Profile, User
from core.push import notify

from .services import cancel_expired_appointments, upcoming_appointments


def _display_name(user_id) -> str:
    p = Profile.objects.filter(user_id=user_id).first()
    if p is None:
        return "your consultant"
    return f"{p.first_name or ''} {p.last_name or ''}".strip() or "your consultant"


@shared_task(name="appointments.tasks.send_appointment_reminders")
def send_appointment_reminders() -> int:
    appts = upcoming_appointments(15)
    for appt in appts:
        when = appt.appointment_datetime.isoformat()
        data = {"appointmentId": str(appt.id)}
        user = User.objects.filter(pk=appt.user_id).first()
        consultant = User.objects.filter(pk=appt.consultant_id).first()
        if user is not None:
            notify(
                user,
                "Appointment Reminder",
                f"Your appointment with {_display_name(appt.consultant_id)} starts at {when}",
                data,
            )
        if consultant is not None:
            notify(
                consultant,
                "Appointment Reminder",
                f"You have an appointment with {_display_name(appt.user_id)} at {when}",
                data,
            )
    return len(appts)


@shared_task(name="appointments.tasks.cancel_expired_appointments")
def cancel_expired_appointments_task() -> int:
    return cancel_expired_appointments()
