# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Mood check-in endpoints, ported from Node `/api/mood` with response parity.

GET /api/mood?date=YYYY-MM-DD  → {"mood": n} | 404 | 400
POST /api/mood {date, mood}    → {"success": true} (upsert per (user, date))
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Mood
from .serializers import MoodSetSerializer


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
        Mood.objects.update_or_create(
            user=request.user,
            mood_date=ser.validated_data["date"],
            defaults={"mood": ser.validated_data["mood"]},
        )
        return Response({"success": True}, status=status.HTTP_200_OK)
