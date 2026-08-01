# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Auth routes, mounted at /api/auth/ — paths mirror the Node backend for cutover parity."""
from django.urls import path

from .views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    PushTokenView,
    RefreshView,
    RegisterConsultantView,
    RegisterUserView,
)

# `send-notification` is intentionally NOT exposed here — the Node route was unauthenticated
# (SEC-1). Push delivery becomes an internal Celery task in R6, not a public endpoint.
urlpatterns = [
    path("register-user", RegisterUserView.as_view(), name="register-user"),
    path("register-consultant", RegisterConsultantView.as_view(), name="register-consultant"),
    path("login-user", LoginView.as_view(), name="login-user"),
    path("refresh-token", RefreshView.as_view(), name="refresh-token"),
    path("logout", LogoutView.as_view(), name="logout"),
    path("change-password", ChangePasswordView.as_view(), name="change-password"),
    path("push-token", PushTokenView.as_view(), name="push-token"),
]
