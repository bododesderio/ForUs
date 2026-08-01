# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Therapist-tools routes, mounted at /api/consultant/ (Stillwater P8)."""
from django.urls import path

from .views import ClientMoodTrendView, ClientsView, EarningsView, SessionNotesView

urlpatterns = [
    path("notes/<uuid:appointment_id>", SessionNotesView.as_view(), name="consultant-notes"),
    path("earnings", EarningsView.as_view(), name="consultant-earnings"),
    path("clients", ClientsView.as_view(), name="consultant-clients"),
    path("clients/<uuid:user_id>/mood-trend", ClientMoodTrendView.as_view(), name="consultant-client-mood"),
]
