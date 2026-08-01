# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Consultation booking domain: appointments and their post-session reviews."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models import CreatedModel, TimeStampedModel, UUIDModel

# Single source of truth for the default consultation length (BUG-6). Serializers
# and services inherit this value instead of re-declaring 60/90 in three places.
DEFAULT_DURATION_MINUTES = 60


class AppointmentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    CANCELLED = "cancelled", "Cancelled"
    COMPLETED = "completed", "Completed"
    NO_SHOW = "no_show", "No show"
    BLOCKED = "blocked", "Blocked"
    IN_SESSION = "in_session", "In session"
    REJECTED = "rejected", "Rejected"


class Appointment(UUIDModel, TimeStampedModel):
    """Source table `appointments`."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="appointments",
        null=True,
        blank=True,
    )
    consultant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="consultant_id",
        related_name="consultant_appointments",
    )
    title = models.CharField(max_length=255, default="Consultation")
    description = models.TextField(null=True, blank=True)
    appointment_datetime = models.DateTimeField()
    duration_minutes = models.IntegerField(default=DEFAULT_DURATION_MINUTES)
    status = models.CharField(
        max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.PENDING
    )
    cancellation_reason = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    mood = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "appointments"
        indexes = [
            models.Index(fields=["user"], name="appointments_user_id_idx"),
            models.Index(fields=["consultant"], name="appointments_consultant_id_idx"),
            models.Index(fields=["appointment_datetime"], name="appointments_datetime_idx"),
            models.Index(fields=["status"], name="appointments_status_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.title} @ {self.appointment_datetime:%Y-%m-%d %H:%M}"


class Review(UUIDModel, CreatedModel):
    """Source table `reviews`. One review per (appointment, user)."""

    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, db_column="appointment_id", related_name="reviews"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="reviews_given",
    )
    consultant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="consultant_id",
        related_name="reviews_received",
    )
    rating = models.IntegerField()
    review_text = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "reviews"
        constraints = [
            models.UniqueConstraint(
                fields=["appointment", "user"], name="reviews_appointment_user_uniq"
            )
        ]

    def __str__(self) -> str:
        return f"Review<{self.appointment_id}> {self.rating}★"
