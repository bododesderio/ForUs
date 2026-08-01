# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Wellness domain: daily mood check-ins (one row per user per day)."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models import TimeStampedModel, UUIDModel


class Mood(UUIDModel, TimeStampedModel):
    """Source table `moods`. Unique per (user, mood_date) — upsert on re-check-in."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_column="user_id", related_name="moods"
    )
    mood_date = models.DateField()
    mood = models.IntegerField()

    class Meta:
        db_table = "moods"
        constraints = [
            models.UniqueConstraint(fields=["user", "mood_date"], name="moods_user_date_uniq")
        ]

    def __str__(self) -> str:
        return f"Mood<{self.user_id}> {self.mood_date}: {self.mood}"
