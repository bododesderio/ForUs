# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Appointment domain logic: auto-cancel, conflict detection, and the perspective-based
list join. Ported from AppointmentServices.js.

Push notifications on state changes are intentionally omitted here — they become
Celery tasks in R6. The state transitions themselves are complete.
"""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from accounts.models import ConsultantDetails, Profile, Role, User

from .models import Appointment, AppointmentStatus, Review

ACTIVE_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_SESSION]
EXPIRABLE_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]
EXPIRY_GRACE = timedelta(minutes=15)


def cancel_expired_appointments() -> int:
    """Cancel pending/confirmed appointments whose start is >15 min in the past."""
    cutoff = timezone.now() - EXPIRY_GRACE
    return Appointment.objects.filter(
        status__in=EXPIRABLE_STATUSES, appointment_datetime__lt=cutoff
    ).update(
        status=AppointmentStatus.CANCELLED,
        cancellation_reason="Missed/Expired",
        updated_at=timezone.now(),
    )


def consultant_exists(consultant_id) -> bool:
    """A real, non-deleted consultant with a details row (mirrors the Node INNER JOIN)."""
    return ConsultantDetails.objects.filter(
        user_id=consultant_id, user__role=Role.CONSULTANT, user__deleted_at__isnull=True
    ).exists()


def has_conflict(consultant_id, new_start, *, exclude_id=None) -> bool:
    """
    True if an active appointment for the consultant covers `new_start`
    (existing.start <= new_start <= existing.start + duration), matching the Node
    overlap check which keys off the new appointment's start instant.
    """
    qs = Appointment.objects.filter(
        consultant_id=consultant_id,
        status__in=ACTIVE_STATUSES,
        appointment_datetime__lte=new_start,
    )
    if exclude_id is not None:
        qs = qs.exclude(pk=exclude_id)
    for appt in qs.only("appointment_datetime", "duration_minutes"):
        end = appt.appointment_datetime + timedelta(minutes=appt.duration_minutes or 0)
        if end >= new_start:
            return True
    return False


def _iso(value):
    return value.isoformat() if value is not None else None


def appointment_base_dict(a: Appointment) -> dict:
    """The `a.*` columns, with Node's snake_case keys and serialized scalars."""
    return {
        "id": str(a.id),
        "user_id": str(a.user_id) if a.user_id else None,
        "consultant_id": str(a.consultant_id) if a.consultant_id else None,
        "title": a.title,
        "description": a.description,
        "appointment_datetime": _iso(a.appointment_datetime),
        "duration_minutes": a.duration_minutes,
        "status": a.status,
        "cancellation_reason": a.cancellation_reason,
        "notes": a.notes,
        "mood": a.mood,
        "created_at": _iso(a.created_at),
        "updated_at": _iso(a.updated_at),
    }


def paginated_appointments(perspective: str, owner_id, params) -> dict:
    """Filtered, paginated appointment list for a perspective, mirroring the Node envelope."""
    import math

    qs = Appointment.objects.all()
    if perspective == "user":
        qs = qs.filter(user_id=owner_id)
    elif perspective == "consultant":
        qs = qs.filter(consultant_id=owner_id)

    status = params.get("status")
    if status:
        qs = qs.filter(status__in=[s.strip() for s in str(status).split(",")])
    if params.get("date_from"):
        qs = qs.filter(appointment_datetime__gte=params["date_from"])
    if params.get("date_to"):
        qs = qs.filter(appointment_datetime__lte=params["date_to"])
    if params.get("date"):
        qs = qs.filter(appointment_datetime__date=params["date"])
    reviewed = params.get("reviewed")
    if reviewed == "true":
        qs = qs.filter(reviews__isnull=False)
    elif reviewed == "false":
        qs = qs.filter(reviews__isnull=True)
    qs = qs.distinct().order_by("-appointment_datetime")

    is_admin = perspective == "admin"
    try:
        page = max(int(params.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        limit = int(params.get("limit", 100 if is_admin else 10))
    except (TypeError, ValueError):
        limit = 100 if is_admin else 10

    total = 0
    if params.get("include_total") == "true" or is_admin:
        total = qs.count()

    offset = (page - 1) * limit
    appts = list(qs[offset : offset + limit])
    total_pages = math.ceil(total / limit) if limit else 0
    return {
        "success": True,
        "message": "Appointments fetched successfully.",
        "appointments": build_appointment_list(appts, perspective),
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
            "hasNext": page < total_pages,
            "hasPrev": page > 1,
        },
    }


def _party(profiles: dict, emails: dict, uid) -> dict:
    p = profiles.get(uid)
    return {
        "name": f"{getattr(p, 'first_name', None) or ''} {getattr(p, 'last_name', None) or ''}".strip() or None,
        "email": emails.get(uid),
        "phone": getattr(p, "phone", None),
        "profile_image": getattr(p, "profile_image", None),
        "dob": _iso(getattr(p, "dob", None)),
        "gender": getattr(p, "gender", None),
    }


def build_appointment_list(appts: list[Appointment], perspective: str) -> list[dict]:
    """
    Attach the joined profile/review fields per perspective (user / consultant / admin),
    reproducing the Node SELECT column names. Batched to avoid N+1.
    """
    user_ids = {a.user_id for a in appts if a.user_id}
    consultant_ids = {a.consultant_id for a in appts if a.consultant_id}
    all_ids = user_ids | consultant_ids
    profiles = {p.user_id: p for p in Profile.objects.filter(user_id__in=all_ids)}
    emails = dict(User.objects.filter(id__in=all_ids).values_list("id", "email"))
    reviews = {r.appointment_id: r for r in Review.objects.filter(appointment_id__in=[a.id for a in appts])}

    rows = []
    for a in appts:
        row = appointment_base_dict(a)
        review = reviews.get(a.id)
        row.update(
            {
                "review_id": str(review.id) if review else None,
                "rating": review.rating if review else None,
                "review_text": review.review_text if review else None,
                "review_date": _iso(review.created_at) if review else None,
            }
        )
        if perspective == "user":
            c = _party(profiles, emails, a.consultant_id)
            row.update(
                {
                    "consultant_name": c["name"],
                    "consultant_email": c["email"],
                    "consultant_phone": c["phone"],
                    "profile_image": c["profile_image"],
                    "dob": c["dob"],
                    "gender": c["gender"],
                }
            )
        elif perspective == "consultant":
            u = _party(profiles, emails, a.user_id)
            row.update(
                {
                    "user_name": u["name"],
                    "user_email": u["email"],
                    "user_phone": u["phone"],
                    "profile_image": u["profile_image"],
                    "dob": u["dob"],
                    "gender": u["gender"],
                }
            )
        else:  # admin — both parties
            u, c = _party(profiles, emails, a.user_id), _party(profiles, emails, a.consultant_id)
            row.update(
                {
                    "user_name": u["name"],
                    "user_email": u["email"],
                    "user_phone": u["phone"],
                    "user_profile_image": u["profile_image"],
                    "user_dob": u["dob"],
                    "user_gender": u["gender"],
                    "consultant_name": c["name"],
                    "consultant_email": c["email"],
                    "consultant_phone": c["phone"],
                    "consultant_profile_image": c["profile_image"],
                    "consultant_dob": c["dob"],
                    "consultant_gender": c["gender"],
                }
            )
        rows.append(row)
    return rows
