# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Identity domain: the custom `User` (email login, role-based, UUID PK) and the
per-role 1:1 detail rows, activity log, and password-reset tokens.

`AUTH_USER_MODEL = "accounts.User"` — set in settings BEFORE the first migration
so the whole schema is anchored to this model (irreversible to change later).
"""
from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from core.models import CreatedModel, TimeStampedModel, UUIDModel


class Role(models.TextChoices):
    USER = "user", "User"
    CONSULTANT = "consultant", "Consultant"
    ADMIN = "admin", "Admin"
    SUPER_ADMIN = "super_admin", "Super admin"


class Gender(models.TextChoices):
    MALE = "male", "Male"
    FEMALE = "female", "Female"
    OTHER = "other", "Other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say", "Prefer not to say"


class AccessLevel(models.TextChoices):
    BASIC = "basic", "Basic"
    MODERATE = "moderate", "Moderate"
    FULL = "full", "Full"


class UserManager(BaseUserManager):
    """Email is the identifier; there is no username field."""

    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra):
        if not email:
            raise ValueError("Users must have an email address")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra):
        extra.setdefault("role", Role.USER)
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email: str, password: str | None = None, **extra):
        extra.setdefault("role", Role.SUPER_ADMIN)
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("email_verified", True)
        if extra.get("is_staff") is not True or extra.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_staff=True and is_superuser=True")
        return self._create_user(email, password, **extra)


class User(UUIDModel, TimeStampedModel, AbstractBaseUser, PermissionsMixin):
    """
    Source table `users`. `password` (Django) stores the bcrypt hash the Node
    backend wrote as `password_hash`; the bcrypt hasher is configured in settings
    so existing hashes verify (R2). Soft-deletable via `deleted_at`.
    """

    email = models.EmailField(max_length=100, unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    tos_accepted_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "users"
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self) -> str:
        return self.email

    def delete(self, using=None, keep_parents=False):
        """Soft delete: tombstone + deactivate so a deleted account cannot authenticate."""
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(using=using, update_fields=["deleted_at", "is_active"])

    def hard_delete(self, using=None, keep_parents=False):
        super().delete(using=using, keep_parents=keep_parents)


class Profile(UUIDModel):
    """Source table `profiles`. Shared by all roles; no timestamp columns."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column="user_id", related_name="profile", db_index=True
    )
    first_name = models.CharField(max_length=50, null=True, blank=True)
    last_name = models.CharField(max_length=50, null=True, blank=True)
    username = models.CharField(max_length=100, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=Gender.choices, null=True, blank=True)
    profile_image = models.CharField(max_length=500, null=True, blank=True)
    push_token = models.CharField(max_length=255, null=True, blank=True)
    notifications_enabled = models.BooleanField(default=True, null=True)

    class Meta:
        db_table = "profiles"

    def __str__(self) -> str:
        return f"Profile<{self.user_id}>"


class ConsultantDetails(UUIDModel):
    """Source table `consultant_details`. Present only for consultant-role users."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="consultant_detail",
        db_index=True,
    )
    profession = models.CharField(max_length=100, null=True, blank=True)
    experience = models.IntegerField(default=0)
    education = models.CharField(max_length=255, null=True, blank=True)
    language = models.CharField(max_length=100, null=True, blank=True)
    available_from = models.TimeField(default="09:00:00")
    available_to = models.TimeField(default="17:00:00")
    available_days = models.JSONField(
        default=list  # ["Monday".."Friday"] seeded at the service layer
    )
    rating = models.FloatField(default=0)
    is_approved = models.BooleanField(default=False)

    class Meta:
        db_table = "consultant_details"
        verbose_name_plural = "consultant details"

    def __str__(self) -> str:
        return f"ConsultantDetails<{self.user_id}>"


class AdminDetails(UUIDModel):
    """Source table `admin_details`. Present only for admin-role users."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column="user_id", related_name="admin_detail"
    )
    department = models.CharField(max_length=100, null=True, blank=True)
    access_level = models.CharField(
        max_length=20, choices=AccessLevel.choices, default=AccessLevel.BASIC, null=True
    )
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "admin_details"
        verbose_name_plural = "admin details"

    def __str__(self) -> str:
        return f"AdminDetails<{self.user_id}>"


class Activity(UUIDModel, CreatedModel):
    """Source table `activities`. Append-only per-user action log."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column="user_id", related_name="activities"
    )
    type = models.CharField(max_length=50)
    description = models.TextField()

    class Meta:
        db_table = "activities"
        verbose_name_plural = "activities"

    def __str__(self) -> str:
        return f"{self.type}<{self.user_id}>"


class PasswordResetToken(UUIDModel, CreatedModel):
    """
    Source table `password_reset_tokens`. Modeled now, wired by Stillwater P2
    (forgot-password flow). Intentionally dormant (ARCH-4).
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column="user_id", related_name="password_reset_tokens"
    )
    token = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "password_reset_tokens"

    def __str__(self) -> str:
        return f"PasswordResetToken<{self.user_id}>"
