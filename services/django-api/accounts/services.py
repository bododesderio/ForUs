# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Auth domain services: registration (transactional, mirrors the Node SQL) and the
activity log. Services raise on failure and never return `{success: False}` sentinels
(ARCH-2) — views translate outcomes into the response envelope.
"""
from __future__ import annotations

import logging

from django.db import transaction

from .models import Activity, ConsultantDetails, Profile, Role, User

logger = logging.getLogger("forus.accounts")


def record_activity(user: User, type: str, description: str) -> None:
    """Append-only per-user action log. Best-effort: a logging failure never breaks the request."""
    try:
        Activity.objects.create(user=user, type=type, description=description)
    except Exception:  # pragma: no cover - logging must not mask the primary operation
        logger.warning("activity_log_failed", extra={"user_id": str(user.pk), "type": type})


@transaction.atomic
def register_user(*, email: str, password: str, username: str | None, profile_image: str | None) -> User:
    """Create a `user`-role account + its profile in one transaction."""
    user = User.objects.create_user(email=email, password=password, role=Role.USER)
    Profile.objects.create(user=user, username=username, profile_image=profile_image)
    record_activity(user, "register", "User registered")
    return user


@transaction.atomic
def register_consultant(
    *, email: str, password: str, username: str | None, first_name: str | None, last_name: str | None
) -> User:
    """Create a `consultant`-role account + profile + (empty) consultant details."""
    user = User.objects.create_user(email=email, password=password, role=Role.CONSULTANT)
    Profile.objects.create(user=user, username=username, first_name=first_name, last_name=last_name)
    ConsultantDetails.objects.create(user=user)
    record_activity(user, "register", "Consultant registered")
    return user
