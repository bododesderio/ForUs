# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
User-domain payload builders and list queries, ported from UserServices.js.

Response keys mirror the Node SELECT columns exactly (cutover parity). Push delivery
lives in R6 (Celery); the notification-send endpoints here only persist rows.
"""
from __future__ import annotations

import math

from django.db.models import Q

from content.models import Notification

from .models import ConsultantDetails, Profile, Role, User

CONSULTANT_SORT = {
    "id": "id",
    "created_at": "created_at",
    "rating": "consultant_detail__rating",
    "first_name": "profile__first_name",
    "last_name": "profile__last_name",
}
USER_SORT = {
    "id": "id",
    "created_at": "created_at",
    "first_name": "profile__first_name",
    "last_name": "profile__last_name",
    "email": "email",
}


def _iso(v):
    return v.isoformat() if v is not None else None


def _profile(user_id) -> Profile | None:
    return Profile.objects.filter(user_id=user_id).first()


def profile_payload(user: User) -> dict:
    """Full self-profile (getProfile) — user + profile (+ consultant details if applicable)."""
    p = _profile(user.id)
    data = {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": _iso(user.created_at),
        "username": getattr(p, "username", None),
        "first_name": getattr(p, "first_name", None),
        "last_name": getattr(p, "last_name", None),
        "profile_image": getattr(p, "profile_image", None),
        "phone": getattr(p, "phone", None),
        "dob": _iso(getattr(p, "dob", None)),
        "gender": getattr(p, "gender", None),
        "push_token": getattr(p, "push_token", None),
        "notifications_enabled": getattr(p, "notifications_enabled", None),
    }
    if user.role == Role.CONSULTANT:
        cd = ConsultantDetails.objects.filter(user=user).first()
        if cd is not None:
            data.update(
                {
                    "profession": cd.profession,
                    "experience": cd.experience,
                    "rating": cd.rating,
                    "education": cd.education,
                    "language": cd.language,
                    "available_from": _iso(cd.available_from),
                    "available_to": _iso(cd.available_to),
                    "available_days": cd.available_days,
                    "is_approved": cd.is_approved,
                }
            )
    return data


def user_detail_payload(user: User) -> dict:
    p = _profile(user.id)
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "created_at": _iso(user.created_at),
        "username": getattr(p, "username", None),
        "first_name": getattr(p, "first_name", None),
        "last_name": getattr(p, "last_name", None),
    }


def consultant_detail_payload(user: User, cd: ConsultantDetails | None = None, p: Profile | None = None) -> dict:
    p = p or _profile(user.id)
    cd = cd or ConsultantDetails.objects.filter(user=user).first()
    return {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "created_at": _iso(user.created_at),
        "username": getattr(p, "username", None),
        "first_name": getattr(p, "first_name", None),
        "last_name": getattr(p, "last_name", None),
        "profile_image": getattr(p, "profile_image", None),
        "profession": getattr(cd, "profession", None),
        "experience": getattr(cd, "experience", None),
        "rating": getattr(cd, "rating", None),
        "education": getattr(cd, "education", None),
        "language": getattr(cd, "language", None),
        "available_from": _iso(getattr(cd, "available_from", None)),
        "available_to": _iso(getattr(cd, "available_to", None)),
        "available_days": getattr(cd, "available_days", None),
    }


def _page_limit(params, default_limit=10):
    try:
        page = max(int(params.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1
    try:
        limit = max(int(params.get("limit", default_limit)), 1)
    except (TypeError, ValueError):
        limit = default_limit
    return page, limit


def _order(params, sort_map, default="id"):
    by = params.get("sortBy", default)
    by = by if by in sort_map else default
    order = (params.get("sortOrder") or "DESC").upper()
    prefix = "" if order == "ASC" else "-"
    return prefix + sort_map[by]


def list_consultants(params) -> dict:
    qs = User.objects.filter(role=Role.CONSULTANT, deleted_at__isnull=True)
    if params.get("profession"):
        qs = qs.filter(consultant_detail__profession=params["profession"])
    if params.get("search"):
        s = params["search"]
        qs = qs.filter(Q(profile__first_name__icontains=s) | Q(profile__last_name__icontains=s) | Q(email__icontains=s))
    qs = qs.distinct().order_by(_order(params, CONSULTANT_SORT))
    total = qs.count()
    page, limit = _page_limit(params)
    offset = (page - 1) * limit
    consultants = [consultant_detail_payload(u) for u in qs[offset : offset + limit]]
    return {
        "success": True,
        "message": "Fetched consultants",
        "consultants": consultants,
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": math.ceil(total / limit)},
    }


def list_users(params) -> dict:
    qs = User.objects.filter(deleted_at__isnull=True)
    if params.get("role"):
        qs = qs.filter(role=params["role"])
    if params.get("search"):
        s = params["search"]
        qs = qs.filter(Q(profile__first_name__icontains=s) | Q(profile__last_name__icontains=s) | Q(email__icontains=s))
    qs = qs.distinct().order_by(_order(params, USER_SORT))
    total = qs.count()
    page, limit = _page_limit(params)
    offset = (page - 1) * limit
    rows = []
    for u in qs[offset : offset + limit]:
        p = _profile(u.id)
        rows.append(
            {
                "id": str(u.id),
                "email": u.email,
                "role": u.role,
                "created_at": _iso(u.created_at),
                "updated_at": _iso(u.updated_at),
                "username": getattr(p, "username", None),
                "first_name": getattr(p, "first_name", None),
                "last_name": getattr(p, "last_name", None),
                "profile_image": getattr(p, "profile_image", None),
                "dob": _iso(getattr(p, "dob", None)),
                "gender": getattr(p, "gender", None),
            }
        )
    return {
        "success": True,
        "message": "Fetched users",
        "users": rows,
        "pagination": {"page": page, "limit": limit, "total": total, "totalPages": math.ceil(total / limit)},
    }


def notification_payload(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "recipient_id": str(n.recipient_id),
        "title": n.title,
        "body": n.body,
        "data": n.data,
        "is_read": n.is_read,
        "created_at": _iso(n.created_at),
    }
