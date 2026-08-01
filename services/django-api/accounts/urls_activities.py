# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Activity feed route, mounted at /api/activities."""
from django.urls import path

from .views import ActivityListView

urlpatterns = [
    path("", ActivityListView.as_view(), name="activities"),
]
