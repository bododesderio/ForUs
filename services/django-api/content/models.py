# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Content domain: curated resource library, events, and user notifications."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models import CreatedModel, SoftDeleteModel, TimeStampedModel, UUIDModel


class ResourceType(models.TextChoices):
    BOOK = "book", "Book"
    ARTICLE = "article", "Article"
    MUSIC = "music", "Music"
    AUDIO = "audio", "Audio"
    PODCAST = "podcast", "Podcast"
    ROUTINE = "routine", "Routine"
    VIDEO = "video", "Video"
    IMAGE = "image", "Image"


class EventStatus(models.TextChoices):
    UPCOMING = "upcoming", "Upcoming"
    ONGOING = "ongoing", "Ongoing"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class Resource(UUIDModel, CreatedModel, SoftDeleteModel):
    """
    Source table `resources`. The consultant FK is PROTECT (source has no ON DELETE
    → Postgres NO ACTION): a resource keeps its author until explicitly reassigned.
    """

    consultant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        db_column="consultant_id",
        related_name="resources",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(max_length=20, choices=ResourceType.choices)
    file_url = models.CharField(max_length=500)
    preview_image_url = models.CharField(max_length=500, null=True, blank=True)
    author = models.CharField(max_length=255, null=True, blank=True)
    duration = models.CharField(max_length=50, null=True, blank=True)
    downloads = models.IntegerField(default=0)
    rating = models.FloatField(default=0)

    class Meta:
        db_table = "resources"

    def __str__(self) -> str:
        return self.title


class Event(UUIDModel, TimeStampedModel):
    """Source table `events`."""

    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    event_date = models.DateTimeField()
    location = models.CharField(max_length=255, null=True, blank=True)
    organizer = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.UPCOMING, null=True
    )

    class Meta:
        db_table = "events"

    def __str__(self) -> str:
        return self.title


class Notification(UUIDModel, CreatedModel):
    """Source table `notifications`. Delivered via Expo push; `data` is the payload."""

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="recipient_id",
        related_name="notifications",
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    body = models.TextField(null=True, blank=True)
    data = models.JSONField(null=True, blank=True)
    is_read = models.BooleanField(default=False, null=True)

    class Meta:
        db_table = "notifications"
        indexes = [
            models.Index(fields=["recipient"], name="notifications_recipient_id_idx"),
        ]

    def __str__(self) -> str:
        return f"Notification<{self.recipient_id}>"
