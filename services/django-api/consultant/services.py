# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Therapist-tools queries (P8): earnings, client roster, per-client mood trend.

Earnings are an estimate from the consultant's per-session rate — everything is
`pending` until real Pesapal disbursements (P5) settle it. When P5 lands, replace
the pending/settled split with a reconciliation against the payouts ledger.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from accounts.models import ConsultantDetails, Profile
from appointments.models import Appointment, AppointmentStatus
from wellness.models import Mood

PLATFORM_FEE_RATE = Decimal("0.25")  # 25% platform fee (marketplace therapists)


def earnings(consultant, period: str = "month") -> dict:
    now = timezone.now()
    start = date(now.year, 1, 1) if period == "year" else date(now.year, now.month, 1)
    sessions = Appointment.objects.filter(
        consultant=consultant, status=AppointmentStatus.COMPLETED, appointment_datetime__date__gte=start
    ).count()
    cd = ConsultantDetails.objects.filter(user=consultant).first()
    rate = cd.session_rate if cd else Decimal("0")
    currency = cd.currency if cd else "UGX"
    gross = (Decimal(sessions) * rate).quantize(Decimal("0.01"))
    fee = (gross * PLATFORM_FEE_RATE).quantize(Decimal("0.01"))
    net = gross - fee
    return {
        "period": "year" if period == "year" else "month",
        "currency": currency,
        "sessions": sessions,
        "gross": str(gross),
        "platform_fee": str(fee),
        "net": str(net),
        "settled": "0.00",  # no disbursements yet (P5)
        "pending": str(net),
    }


def clients(consultant) -> list[dict]:
    user_ids = list(
        Appointment.objects.filter(consultant=consultant, user__isnull=False)
        .values_list("user_id", flat=True)
        .distinct()
    )
    profiles = {p.user_id: p for p in Profile.objects.filter(user_id__in=user_ids)}
    rows = []
    for uid in user_ids:
        p = profiles.get(uid)
        rows.append(
            {
                "id": str(uid),
                "username": getattr(p, "username", None),
                "first_name": getattr(p, "first_name", None),
                "last_name": getattr(p, "last_name", None),
                "profile_image": getattr(p, "profile_image", None),
                "session_count": Appointment.objects.filter(
                    consultant=consultant, user_id=uid, status=AppointmentStatus.COMPLETED
                ).count(),
            }
        )
    return rows


def has_client_relationship(consultant, user_id) -> bool:
    return Appointment.objects.filter(consultant=consultant, user_id=user_id).exists()


def client_mood_trend(user_id, days: int = 30) -> list[dict]:
    start = timezone.now().date() - timedelta(days=days - 1)
    return [
        {"date": m.mood_date.isoformat(), "mood": m.mood}
        for m in Mood.objects.filter(user_id=user_id, mood_date__gte=start).order_by("mood_date")
    ]
