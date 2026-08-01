# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Mood routes, mounted at /api/mood."""
from django.urls import path

from .views import MoodView

urlpatterns = [
    path("", MoodView.as_view(), name="mood"),
]
