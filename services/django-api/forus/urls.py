# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Root URL configuration. Gateway routes /api/** here."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/admin/", admin.site.urls),  # admin relocated off /admin/ (traefik-routing convention)
    path("api/auth/", include("accounts.urls")),
    path("api/", include("core.urls")),
]
