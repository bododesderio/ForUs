# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Daily streak recompute (P3) — caches `profiles.streak_days` from mood continuity."""
from __future__ import annotations

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from accounts.models import Profile

from .models import Mood
from .views import compute_streak


@shared_task(name="wellness.tasks.recompute_streaks")
def recompute_streaks() -> int:
    """Refresh cached streaks for users who checked in within the last day."""
    today = timezone.now().date()
    recent = set(
        Mood.objects.filter(mood_date__gte=today - timedelta(days=1)).values_list("user_id", flat=True)
    )
    updated = 0
    for profile in Profile.objects.filter(user_id__in=recent).select_related("user"):
        streak = compute_streak(profile.user, today)
        if profile.streak_days != streak:
            profile.streak_days = streak
            profile.save(update_fields=["streak_days"])
        updated += 1
    return updated
