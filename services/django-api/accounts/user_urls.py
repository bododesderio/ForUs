# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""User-domain routes, mounted at /api/users/ — paths mirror the Node backend."""
from django.urls import path

from .user_views import (
    ConsultantDetailView,
    ConsultantPushTokenView,
    ConsultantSendNotificationView,
    ConsultantsListView,
    DeleteConsultantView,
    DeleteUserView,
    MarkNotificationReadView,
    NotificationPreferenceView,
    NotificationsView,
    ProfileView,
    PushTokenView,
    SaveNotificationView,
    SendNotificationView,
    UpdateProfileView,
    UserDetailView,
    UsersListView,
)

urlpatterns = [
    path("profile", ProfileView.as_view(), name="user-profile"),
    path("update-profile", UpdateProfileView.as_view(), name="user-update-profile"),
    path("consultants", ConsultantsListView.as_view(), name="consultant-list"),
    # consultant/* literals before the <uuid> detail
    path("consultant/notifications", NotificationsView.as_view(), name="consultant-notifications"),
    path("consultant/push-token", ConsultantPushTokenView.as_view(), name="consultant-push-token"),
    path("consultant/send-notification", ConsultantSendNotificationView.as_view(), name="consultant-send-notification"),
    path("consultant/<uuid:pk>", ConsultantDetailView.as_view(), name="consultant-detail"),
    path("users", UsersListView.as_view(), name="user-list"),
    path("user/<uuid:pk>", UserDetailView.as_view(), name="user-detail"),
    path("delete/user/<uuid:pk>", DeleteUserView.as_view(), name="user-delete"),
    path("delete/consultant/<uuid:pk>", DeleteConsultantView.as_view(), name="consultant-delete"),
    path("push-token", PushTokenView.as_view(), name="user-push-token"),
    path("send-notification", SendNotificationView.as_view(), name="user-send-notification"),
    path("notification/save", SaveNotificationView.as_view(), name="notification-save"),
    path("notifications", NotificationsView.as_view(), name="user-notifications"),
    path("notification/read", MarkNotificationReadView.as_view(), name="notification-read"),
    path("notification-preference", NotificationPreferenceView.as_view(), name="notification-preference"),
]
