# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Mood check-in endpoints, ported from Node `/api/mood` with response parity.

GET /api/mood?date=YYYY-MM-DD  → {"mood": n} | 404 | 400
POST /api/mood {date, mood}    → {"success": true} (upsert per (user, date))
"""
from __future__ import annotations

from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Mood
from .serializers import MoodSetSerializer


def compute_streak(user, today=None) -> int:
    """Consecutive check-in days ending today (or yesterday, if today isn't logged yet)."""
    today = today or timezone.now().date()
    dates = set(Mood.objects.filter(user=user).values_list("mood_date", flat=True))
    day = today if today in dates else today - timedelta(days=1)
    streak = 0
    while day in dates:
        streak += 1
        day -= timedelta(days=1)
    return streak


class MoodView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        date = request.query_params.get("date")
        if not date:
            return Response({"message": "Date is required"}, status=status.HTTP_400_BAD_REQUEST)
        row = Mood.objects.filter(user=request.user, mood_date=date).first()
        if row is None:
            return Response(
                {"message": "No mood set for this date"}, status=status.HTTP_404_NOT_FOUND
            )
        return Response({"mood": row.mood}, status=status.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        ser = MoodSetSerializer(data=request.data)
        if not ser.is_valid():
            # Parity: Node returns one flat message rather than field errors here.
            return Response(
                {"message": "Date and mood (number) are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = ser.validated_data
        Mood.objects.update_or_create(
            user=request.user,
            mood_date=data["date"],
            defaults={
                "mood": data["mood"],
                "mood_color": data.get("mood_color"),
                "feeling_tags": data.get("feeling_tags") or [],
                "note": data.get("note"),
            },
        )
        return Response({"success": True}, status=status.HTTP_200_OK)


class ProfileStatsView(APIView):
    """GET /api/profile/stats → streak, sessions, practice minutes, 30-day mood trend (P3)."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        from appointments.models import Appointment, AppointmentStatus

        user = request.user
        today = timezone.now().date()
        completed = Appointment.objects.filter(user=user, status=AppointmentStatus.COMPLETED)
        trend = [
            {"date": m.mood_date.isoformat(), "mood": m.mood}
            for m in Mood.objects.filter(user=user, mood_date__gte=today - timedelta(days=29)).order_by("mood_date")
        ]
        return Response(
            {
                "success": True,
                "streak_days": compute_streak(user, today),
                "total_sessions": completed.count(),
                "total_practice_minutes": completed.aggregate(s=Sum("duration_minutes"))["s"] or 0,
                "mood_trend_30d": trend,
            },
            status=status.HTTP_200_OK,
        )
