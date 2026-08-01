# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Appointment state changes persist notifications (the deferred R6 push points, now wired)."""
from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ConsultantDetails, Profile, Role, User
from appointments.models import Appointment, AppointmentStatus
from content.models import Notification

pytestmark = pytest.mark.django_db


def _user(email, role=Role.USER):
    u = User.objects.create_user(email=email, password="correct-horse-9", role=role)
    Profile.objects.create(user=u, username=email.split("@")[0], first_name="A", last_name="B")
    if role == Role.CONSULTANT:
        ConsultantDetails.objects.create(user=u)
    return u


def _c(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def _titles_for(user):
    return set(Notification.objects.filter(recipient=user).values_list("title", flat=True))


def test_create_notifies_both_parties():
    user, consultant = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    _c(user).post(
        "/api/appointments/create",
        {"consultant_id": str(consultant.id), "appointment_datetime": (timezone.now() + timedelta(days=1)).isoformat()},
        format="json",
    )
    assert "Appointment Booked" in _titles_for(user)
    assert "New Appointment" in _titles_for(consultant)


def test_confirm_notifies_user():
    user, consultant = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    appt = Appointment.objects.create(
        user=user, consultant=consultant, appointment_datetime=timezone.now() + timedelta(days=1),
        duration_minutes=60, status=AppointmentStatus.PENDING,
    )
    _c(consultant).post(f"/api/appointments/{appt.id}/confirm")
    assert "Appointment Confirmed" in _titles_for(user)


def test_cancel_notifies_both():
    user, consultant = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    appt = Appointment.objects.create(
        user=user, consultant=consultant, appointment_datetime=timezone.now() + timedelta(days=1),
        duration_minutes=60, status=AppointmentStatus.CONFIRMED,
    )
    _c(user).post(f"/api/appointments/{appt.id}/cancel", {}, format="json")
    assert "Appointment Cancelled" in _titles_for(user)
    assert "Appointment Cancelled" in _titles_for(consultant)


def test_review_notifies_consultant():
    user, consultant = _user("u@forus.app"), _user("c@forus.app", Role.CONSULTANT)
    Appointment.objects.create(
        user=user, consultant=consultant, appointment_datetime=timezone.now() + timedelta(days=1),
        duration_minutes=60, status=AppointmentStatus.COMPLETED,
    )
    _c(user).post(f"/api/appointments/{consultant.id}/review", {"rating": 5}, format="json")
    assert "New Review Received" in _titles_for(consultant)
