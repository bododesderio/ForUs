# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Appointment endpoints (15), ported from Node with response parity.

Beyond parity: the per-id list endpoints enforce ownership (a user/consultant may
read only their own list; admins read any). The Node routes had no such check — any
authenticated caller could read another person's therapist appointments (IDOR). The
frontend only ever fetches its own list, so legitimate flows are unaffected.

Push notifications on state changes are deferred to R6 (Celery); transitions are complete.
"""
from __future__ import annotations

from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status as http
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ConsultantDetails, Profile, Role, User
from accounts.services import record_activity
from core.permissions import ADMIN_ROLES

from .models import DEFAULT_DURATION_MINUTES, Appointment, AppointmentStatus, Review
from .services import (
    ACTIVE_STATUSES,
    appointment_base_dict,
    cancel_expired_appointments,
    consultant_exists,
    has_conflict,
    paginated_appointments,
)

VALID_UPDATE_STATUSES = {
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_SESSION,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.REJECTED,
}


def _parse_dt(value):
    if not value:
        return None
    dt = parse_datetime(value) if isinstance(value, str) else value
    if dt is not None and timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return dt


def _is_admin(user) -> bool:
    return user.role in ADMIN_ROLES


def _err(message: str, code: int, *, key: str = "message"):
    return Response({"success": False, key: message}, status=code)


# ─── Create ──────────────────────────────────────────────────────────────────────
class CreateAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if request.user.role != Role.USER:
            return Response({"error": "Only users can create appointments"}, status=http.HTTP_403_FORBIDDEN)
        data = request.data
        consultant_id, raw_dt = data.get("consultant_id"), data.get("appointment_datetime")
        if not consultant_id or not raw_dt:
            return _err("Consultant ID and appointment_datetime are required", http.HTTP_400_BAD_REQUEST)
        when = _parse_dt(raw_dt)
        if when is None:
            return _err("Invalid appointment_datetime", http.HTTP_400_BAD_REQUEST)
        if not consultant_exists(consultant_id):
            return _err("Consultant not found or inactive", http.HTTP_400_BAD_REQUEST)
        if has_conflict(consultant_id, when):
            return _err("Time slot is already booked", http.HTTP_400_BAD_REQUEST)

        appt = Appointment.objects.create(
            user=request.user,
            consultant_id=consultant_id,
            title=data.get("title") or "Consultation",
            description=data.get("description"),
            appointment_datetime=when,
            duration_minutes=data.get("duration_minutes") or DEFAULT_DURATION_MINUTES,  # BUG-6
            status=AppointmentStatus.PENDING,
            mood=data.get("mood"),
        )
        record_activity(
            request.user, "appointment_create", f"Created appointment with consultant ID {consultant_id}"
        )
        return Response(
            {"success": True, "message": "Appointment created successfully", "appointment": appointment_base_dict(appt)},
            status=http.HTTP_201_CREATED,
        )


# ─── Lists ───────────────────────────────────────────────────────────────────────
class MyAppointmentsView(APIView):
    """GET /api/appointments/get — the caller's own list (perspective from role)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        cancel_expired_appointments()
        role = request.user.role
        perspective = "consultant" if role == Role.CONSULTANT else "user"
        return Response(paginated_appointments(perspective, request.user.id, request.query_params), status=http.HTTP_200_OK)


class AllAppointmentsView(APIView):
    """GET /api/appointments/all — admin only."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        if not _is_admin(request.user):
            return Response({"error": "Only admins are allowed to get all appointments."}, status=http.HTTP_403_FORBIDDEN)
        cancel_expired_appointments()
        return Response(paginated_appointments("admin", None, request.query_params), status=http.HTTP_200_OK)


class UserAppointmentsView(APIView):
    """GET /api/appointments/user/<id> — that user's list (owner or admin only)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, user_id) -> Response:
        if str(request.user.id) != str(user_id) and not _is_admin(request.user):
            return Response({"error": "Not authorized"}, status=http.HTTP_403_FORBIDDEN)
        cancel_expired_appointments()
        return Response(paginated_appointments("user", user_id, request.query_params), status=http.HTTP_200_OK)


class ConsultantAppointmentsView(APIView):
    """GET /api/appointments/consultant/<id> — that consultant's list (owner or admin only)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, consultant_id) -> Response:
        if str(request.user.id) != str(consultant_id) and not _is_admin(request.user):
            return Response({"error": "Not authorized"}, status=http.HTTP_403_FORBIDDEN)
        cancel_expired_appointments()
        return Response(paginated_appointments("consultant", consultant_id, request.query_params), status=http.HTTP_200_OK)


class ConsultantAvailabilityView(APIView):
    """GET /api/appointments/consultant/<id>/availability — booked slots (any authed user)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, consultant_id) -> Response:
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        if not date_from or not date_to:
            return _err("date_from and date_to are required", http.HTTP_400_BAD_REQUEST)
        rows = (
            Appointment.objects.filter(
                consultant_id=consultant_id,
                status__in=ACTIVE_STATUSES,
                appointment_datetime__range=[date_from, date_to],
            )
            .order_by("appointment_datetime")
            .values("appointment_datetime", "status")
        )
        appointments = [
            {"appointment_datetime": r["appointment_datetime"].isoformat(), "status": r["status"]} for r in rows
        ]
        return Response(
            {"success": True, "message": "Availability fetched successfully.", "appointments": appointments},
            status=http.HTTP_200_OK,
        )


# ─── Status transitions ──────────────────────────────────────────────────────────
def _apply_status(request, appointment_id, new_status, cancellation_reason=None) -> Response:
    appt = Appointment.objects.filter(pk=appointment_id).first()
    if appt is None:
        return _err("Appointment not found", http.HTTP_400_BAD_REQUEST)
    role = request.user.role
    if role == Role.CONSULTANT and str(appt.consultant_id) != str(request.user.id):
        return _err("Not authorized to update this appointment", http.HTTP_400_BAD_REQUEST)
    if role == Role.USER and str(appt.user_id) != str(request.user.id):
        return _err("Not authorized to update this appointment", http.HTTP_400_BAD_REQUEST)
    if role == Role.USER and new_status not in {AppointmentStatus.CANCELLED, AppointmentStatus.IN_SESSION}:
        return _err("Users can only cancel appointments or start sessions", http.HTTP_400_BAD_REQUEST)
    if new_status not in VALID_UPDATE_STATUSES:
        return _err("Invalid status", http.HTTP_400_BAD_REQUEST)
    appt.status = new_status
    appt.cancellation_reason = cancellation_reason
    appt.save(update_fields=["status", "cancellation_reason", "updated_at"])
    return Response({"success": True, "message": "Appointment status updated successfully"}, status=http.HTTP_200_OK)


class UpdateStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, pk) -> Response:
        return _apply_status(request, pk, request.data.get("status"), request.data.get("cancellation_reason"))


class CancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk) -> Response:
        return _apply_status(request, pk, AppointmentStatus.CANCELLED, request.data.get("cancellation_reason"))


class StartSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk) -> Response:
        return _apply_status(request, pk, AppointmentStatus.IN_SESSION)


class ConfirmView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk) -> Response:
        if request.user.role != Role.CONSULTANT:
            return _err("Only consultants can confirm appointments", http.HTTP_403_FORBIDDEN)
        return self._transition(request, pk, AppointmentStatus.CONFIRMED, "Appointment confirmed", "confirm")

    @staticmethod
    def _transition(request, pk, target, ok_message, verb) -> Response:
        appt = Appointment.objects.filter(pk=pk).first()
        if appt is None:
            return _err("Appointment not found", http.HTTP_400_BAD_REQUEST)
        if str(appt.consultant_id) != str(request.user.id):
            return _err(f"Not authorized to {verb} this appointment", http.HTTP_400_BAD_REQUEST)
        if appt.status != AppointmentStatus.PENDING:
            return _err(f"Only pending appointments can be {verb}ed", http.HTTP_400_BAD_REQUEST)
        appt.status = target
        appt.save(update_fields=["status", "updated_at"])
        return Response({"success": True, "message": ok_message}, status=http.HTTP_200_OK)


class RejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk) -> Response:
        if request.user.role != Role.CONSULTANT:
            return _err("Only consultants can reject appointments", http.HTTP_403_FORBIDDEN)
        return ConfirmView._transition(request, pk, AppointmentStatus.REJECTED, "Appointment rejected", "reject")


class RescheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk) -> Response:
        new_dt = _parse_dt(request.data.get("new_datetime"))
        if new_dt is None:
            return _err("New datetime is required", http.HTTP_400_BAD_REQUEST)
        appt = Appointment.objects.filter(pk=pk).first()
        if appt is None:
            return _err("Appointment not found", http.HTTP_400_BAD_REQUEST)
        role = request.user.role
        owns = (role == Role.CONSULTANT and str(appt.consultant_id) == str(request.user.id)) or (
            role == Role.USER and str(appt.user_id) == str(request.user.id)
        )
        if not owns:
            return _err("Not authorized to reschedule this appointment", http.HTTP_400_BAD_REQUEST)
        if has_conflict(appt.consultant_id, new_dt, exclude_id=appt.id):
            return _err("Time slot is already booked", http.HTTP_400_BAD_REQUEST)
        appt.appointment_datetime = new_dt
        appt.status = AppointmentStatus.PENDING
        appt.save(update_fields=["appointment_datetime", "status", "updated_at"])
        return Response({"success": True, "message": "Appointment rescheduled successfully"}, status=http.HTTP_200_OK)


# ─── Reviews ─────────────────────────────────────────────────────────────────────
class ReviewView(APIView):
    """POST /api/appointments/<consultant_id>/review — user reviews a consultant."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk) -> Response:
        if request.user.role != Role.USER:
            return Response({"error": "Only users can leave reviews"}, status=http.HTTP_403_FORBIDDEN)
        consultant_id = pk
        if not consultant_exists(consultant_id):
            return _err("Consultant not found", http.HTTP_400_BAD_REQUEST)
        if Review.objects.filter(consultant_id=consultant_id, user=request.user).exists():
            return _err("Review already exists for this consultant", http.HTTP_400_BAD_REQUEST)
        completed = Appointment.objects.filter(
            user=request.user, consultant_id=consultant_id, status=AppointmentStatus.COMPLETED
        ).first()
        if completed is None:
            return _err(
                "You must have a completed appointment with this consultant to leave a review",
                http.HTTP_400_BAD_REQUEST,
            )
        Review.objects.create(
            appointment=completed,
            consultant_id=consultant_id,
            user=request.user,
            rating=request.data.get("rating"),
            review_text=request.data.get("review_text"),
        )
        # Refresh the cached average on the consultant's details row.
        from django.db.models import Avg

        avg = Review.objects.filter(consultant_id=consultant_id).aggregate(a=Avg("rating"))["a"] or 0
        ConsultantDetails.objects.filter(user_id=consultant_id).update(rating=round(float(avg), 2))
        return Response({"success": True, "message": "Review added successfully"}, status=http.HTTP_200_OK)


class ConsultantReviewsView(APIView):
    """GET /api/appointments/consultants/<consultant_id>/reviews — public, paginated."""

    permission_classes = [AllowAny]

    def get(self, request: Request, consultant_id) -> Response:
        import math

        try:
            page = int(request.query_params.get("page", 1))
            limit = int(request.query_params.get("limit", 10))
        except (TypeError, ValueError):
            return _err("Invalid pagination parameters", http.HTTP_400_BAD_REQUEST)
        if page < 1 or limit < 1 or limit > 50:
            return _err("Invalid pagination parameters", http.HTTP_400_BAD_REQUEST)
        sort_by = request.query_params.get("sortBy", "created_at")
        sort_order = request.query_params.get("sortOrder", "DESC")
        if sort_by not in {"created_at", "rating"} or sort_order not in {"ASC", "DESC"}:
            return _err("Invalid sorting parameters", http.HTTP_400_BAD_REQUEST)

        if not User.objects.filter(id=consultant_id, role=Role.CONSULTANT).exists():
            return _err("Consultant not found", http.HTTP_404_NOT_FOUND)

        order = ("" if sort_order == "ASC" else "-") + sort_by
        base = Review.objects.filter(consultant_id=consultant_id)
        total = base.count()
        total_pages = math.ceil(total / limit) if limit else 0
        offset = (page - 1) * limit
        profiles = {p.user_id: p for p in Profile.objects.filter(user_id__in=base.values_list("user_id", flat=True))}
        reviews = []
        for r in base.order_by(order)[offset : offset + limit]:
            p = profiles.get(r.user_id)
            name = f"{getattr(p, 'first_name', None) or ''} {getattr(p, 'last_name', None) or ''}".strip() or None
            reviews.append(
                {
                    "id": str(r.id),
                    "rating": r.rating,
                    "review_text": r.review_text,
                    "created_at": r.created_at.isoformat(),
                    "user_name": name,
                    "user_profile_image": getattr(p, "profile_image", None),
                }
            )
        from django.db.models import Avg

        avg = base.aggregate(a=Avg("rating"))["a"]
        return Response(
            {
                "success": True,
                "reviews": reviews,
                "pagination": {
                    "current_page": page,
                    "total_pages": total_pages,
                    "total_reviews": total,
                    "reviews_per_page": limit,
                    "has_next": page < total_pages,
                    "has_previous": page > 1,
                },
                "statistics": {"average_rating": round(float(avg), 2) if avg is not None else 0},
            },
            status=http.HTTP_200_OK,
        )


# ─── Consultant slot blocking ────────────────────────────────────────────────────
class BlockSlotView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        if request.user.role != Role.CONSULTANT:
            return _err("Only consultants can block slots", http.HTTP_403_FORBIDDEN)
        when = _parse_dt(request.data.get("appointment_datetime"))
        if when is None:
            return _err("appointment_datetime is required", http.HTTP_400_BAD_REQUEST)
        if Appointment.objects.filter(
            consultant=request.user, appointment_datetime=when, status=AppointmentStatus.BLOCKED
        ).exists():
            return _err("Slot already blocked", http.HTTP_400_BAD_REQUEST)
        Appointment.objects.create(
            consultant=request.user,
            appointment_datetime=when,
            duration_minutes=request.data.get("duration_minutes") or DEFAULT_DURATION_MINUTES,
            status=AppointmentStatus.BLOCKED,
        )
        return Response({"success": True}, status=http.HTTP_201_CREATED)
