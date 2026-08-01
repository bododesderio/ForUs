# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Celery task tests (R6) — reminder correctness (BUG-5), push gating, auto-cancel."""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone

from accounts.models import ConsultantDetails, Profile, Role, User
from appointments.models import Appointment, AppointmentStatus
from appointments.services import upcoming_appointments
from appointments.tasks import cancel_expired_appointments_task, send_appointment_reminders
from content.models import Notification
from core.push import send_expo_push

pytestmark = pytest.mark.django_db


def _user(email, role=Role.USER, push_token=None, enabled=True):
    u = User.objects.create_user(email=email, password="correct-horse-9", role=role)
    Profile.objects.create(
        user=u, username=email.split("@")[0], first_name="A", last_name="B",
        push_token=push_token, notifications_enabled=enabled,
    )
    if role == Role.CONSULTANT:
        ConsultantDetails.objects.create(user=u)
    return u


def _appt(user, consultant, minutes, status=AppointmentStatus.PENDING):
    return Appointment.objects.create(
        user=user, consultant=consultant,
        appointment_datetime=timezone.now() + timedelta(minutes=minutes),
        duration_minutes=60, status=status,
    )


def test_upcoming_appointments_window():
    u, c = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    inside = _appt(u, c, 10)
    outside = _appt(u, c, 45)
    completed = _appt(u, c, 5, status=AppointmentStatus.COMPLETED)
    ids = {a.id for a in upcoming_appointments(15)}
    assert inside.id in ids
    assert outside.id not in ids and completed.id not in ids


def test_reminder_persists_one_row_per_recipient_bug5():
    # No push tokens → no delivery, but in-app rows must still be recorded correctly.
    u, c = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    _appt(u, c, 10)
    count = send_appointment_reminders()
    assert count == 1  # one appointment processed
    rows = Notification.objects.all()
    assert rows.count() == 2  # exactly one per recipient (Node saved four, all null recipient_id)
    assert {str(r.recipient_id) for r in rows} == {str(u.id), str(c.id)}
    assert all(r.recipient_id is not None for r in rows)


def test_reminder_pushes_when_opted_in(monkeypatch):
    sent = []
    monkeypatch.setattr("core.push.send_expo_push", lambda *a, **k: sent.append(a))
    u = _user("u@forus.app", push_token="ExponentPushToken[u]")
    c = _user("c@forus.app", Role.CONSULTANT, push_token="ExponentPushToken[c]")
    _appt(u, c, 10)
    send_appointment_reminders()
    assert len(sent) == 2  # both recipients pushed


def test_reminder_skips_push_when_disabled(monkeypatch):
    sent = []
    monkeypatch.setattr("core.push.send_expo_push", lambda *a, **k: sent.append(a))
    u = _user("u@forus.app", push_token="ExponentPushToken[u]", enabled=False)
    c = _user("c@forus.app", Role.CONSULTANT)  # no token
    _appt(u, c, 10)
    send_appointment_reminders()
    assert sent == []  # opted-out user + tokenless consultant → no push
    assert Notification.objects.count() == 2  # rows still recorded


def test_cancel_expired_task():
    u, c = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    stale = _appt(u, c, -120)  # started 2h ago, still pending
    assert cancel_expired_appointments_task() >= 1
    stale.refresh_from_db()
    assert stale.status == AppointmentStatus.CANCELLED
    assert stale.cancellation_reason == "Missed/Expired"


def test_send_expo_push_rejects_invalid_token():
    with pytest.raises(ValueError):
        send_expo_push("not-an-expo-token", "t", "b")
