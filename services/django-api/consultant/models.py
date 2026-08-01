# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Therapist tools (Stillwater P8): the SOAP session note, one per appointment."""
from __future__ import annotations

from django.db import models

from core.models import TimeStampedModel, UUIDModel


class SessionNote(UUIDModel, TimeStampedModel):
    """
    A SOAP note attached to a completed/ongoing appointment. Written by the
    consultant; optionally shared with the client via `shared_with_client`.
    """

    appointment = models.OneToOneField(
        "appointments.Appointment",
        on_delete=models.CASCADE,
        db_column="appointment_id",
        related_name="session_note",
    )
    consultant = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, db_column="consultant_id", related_name="session_notes"
    )
    subjective = models.TextField(blank=True, default="")
    objective = models.TextField(blank=True, default="")
    assessment = models.TextField(blank=True, default="")
    plan = models.TextField(blank=True, default="")
    shared_with_client = models.BooleanField(default=False)

    class Meta:
        db_table = "session_notes"

    def __str__(self) -> str:
        return f"SessionNote<{self.appointment_id}>"
