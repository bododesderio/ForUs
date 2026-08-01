# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Root URL configuration. Gateway routes /api/** here."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("api/admin/", admin.site.urls),  # admin relocated off /admin/ (traefik-routing convention)
    path("api/auth/", include("accounts.urls")),
    path("api/users/", include("accounts.user_urls")),
    path("api/activities", include("accounts.urls_activities")),
    path("api/mood", include("wellness.urls")),
    path("api/appointments/", include("appointments.urls")),
    path("api/chat/", include("chat.urls")),
    path("api/community/", include("community.urls")),
    path("api/", include("content.urls")),  # events + resources
    path("api/", include("core.urls")),
]
