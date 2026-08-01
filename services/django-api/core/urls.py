# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.urls import path

from .views import HealthView, UploadView

urlpatterns = [
    path("health", HealthView.as_view(), name="health"),
    path("upload", UploadView.as_view(), name="upload"),
]
