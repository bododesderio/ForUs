# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Therapist-tools endpoints (P8) — all consultant-only, mounted at /api/consultant/."""
from __future__ import annotations

from rest_framework import status as http
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import Appointment
from core.permissions import IsConsultantRole

from .models import SessionNote
from .services import client_mood_trend, clients, earnings, has_client_relationship


def _note_payload(note: SessionNote | None) -> dict | None:
    if note is None:
        return None
    return {
        "id": str(note.id),
        "appointment_id": str(note.appointment_id),
        "subjective": note.subjective,
        "objective": note.objective,
        "assessment": note.assessment,
        "plan": note.plan,
        "shared_with_client": note.shared_with_client,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }


class SessionNotesView(APIView):
    """GET/POST /api/consultant/notes/<appointment_id> — the consultant's SOAP note."""

    permission_classes = [IsConsultantRole]

    def _owned_appointment(self, request, appointment_id):
        return Appointment.objects.filter(pk=appointment_id, consultant=request.user).first()

    def get(self, request: Request, appointment_id) -> Response:
        if self._owned_appointment(request, appointment_id) is None:
            return Response({"success": False, "message": "Appointment not found"}, status=http.HTTP_404_NOT_FOUND)
        note = SessionNote.objects.filter(appointment_id=appointment_id).first()
        return Response({"success": True, "note": _note_payload(note)}, status=http.HTTP_200_OK)

    def post(self, request: Request, appointment_id) -> Response:
        appt = self._owned_appointment(request, appointment_id)
        if appt is None:
            return Response({"success": False, "message": "Appointment not found"}, status=http.HTTP_404_NOT_FOUND)
        data = request.data
        note, _ = SessionNote.objects.update_or_create(
            appointment=appt,
            defaults={
                "consultant": request.user,
                "subjective": data.get("subjective", "") or "",
                "objective": data.get("objective", "") or "",
                "assessment": data.get("assessment", "") or "",
                "plan": data.get("plan", "") or "",
                "shared_with_client": bool(data.get("shared_with_client", False)),
            },
        )
        return Response({"success": True, "note": _note_payload(note)}, status=http.HTTP_200_OK)


class EarningsView(APIView):
    permission_classes = [IsConsultantRole]

    def get(self, request: Request) -> Response:
        period = request.query_params.get("period", "month")
        return Response({"success": True, "earnings": earnings(request.user, period)}, status=http.HTTP_200_OK)


class ClientsView(APIView):
    permission_classes = [IsConsultantRole]

    def get(self, request: Request) -> Response:
        return Response({"success": True, "clients": clients(request.user)}, status=http.HTTP_200_OK)


class ClientMoodTrendView(APIView):
    """GET /api/consultant/clients/<user_id>/mood-trend?days=30 — only for one's own clients."""

    permission_classes = [IsConsultantRole]

    def get(self, request: Request, user_id) -> Response:
        if not has_client_relationship(request.user, user_id):
            return Response(
                {"success": False, "message": "Not your client"}, status=http.HTTP_403_FORBIDDEN
            )
        try:
            days = min(max(int(request.query_params.get("days", 30)), 1), 365)
        except (TypeError, ValueError):
            days = 30
        return Response(
            {"success": True, "mood_trend": client_mood_trend(user_id, days)}, status=http.HTTP_200_OK
        )
