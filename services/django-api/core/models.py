# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Shared abstract base models for the ForUs schema (single source of truth: Django
migrations, ARCH-1). Every domain app builds on these so UUID PKs, timestamp
stamps, and soft-delete semantics stay uniform across the platform.
"""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class UUIDModel(models.Model):
    """Primary key is a random UUIDv4 — no sequential enumeration (SEC/IDOR posture)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class CreatedModel(models.Model):
    """Insert-only stamp for tables the source schema never mutates in place."""

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """created_at / updated_at, mirroring the source `defaultNow()` columns."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager):
    """Default manager: hides soft-deleted rows so ordinary queries never see them."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager):
    """Escape hatch for admin/audit: returns every row, deleted or not."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    """`deleted_at` tombstone. `.delete()` is soft; `.hard_delete()` truly removes."""

    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(using=using, update_fields=["deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])


class AuditLog(UUIDModel, CreatedModel):
    """
    Append-only record of sensitive/admin actions (P9). Distinct from `activities`,
    which is a user-facing timeline — this is the security/compliance trail.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        db_column="actor_id",
        related_name="audit_actions",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=100)  # e.g. "user.delete", "event.create"
    target_type = models.CharField(max_length=50, blank=True, default="")
    target_id = models.CharField(max_length=64, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=64, null=True, blank=True)

    class Meta:
        db_table = "audit_logs"
        indexes = [
            models.Index(fields=["action"], name="audit_action_idx"),
            models.Index(fields=["actor"], name="audit_actor_idx"),
            models.Index(fields=["-created_at"], name="audit_created_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.action} by {self.actor_id or 'system'}"
