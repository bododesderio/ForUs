# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.urls import path

from .views import HealthView

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
]
