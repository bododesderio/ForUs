# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
User-domain endpoints (17), ported from UserController.js with response parity.

Hardenings beyond parity: `GET /users` and the two `send-notification` endpoints are
admin-only (they list PII / let any caller push to any id in Node). Push delivery is
deferred to R6 — send-notification persists a notification row.
"""
from __future__ import annotations

from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from content.models import Notification
from core.audit import client_ip, record_audit
from core.permissions import IsAdminRole

from .models import Profile, Role, User
from .services import record_activity
from .user_services import (
    consultant_detail_payload,
    list_consultants,
    list_users,
    notification_payload,
    profile_payload,
    user_detail_payload,
)

PROFILE_FIELDS = ["username", "first_name", "last_name", "phone", "profile_image", "dob", "gender"]


def _ok(body, code=http.HTTP_200_OK):
    return Response(body, status=code)


def _err(message, code=http.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "message": message}, status=code)


# ─── Profile ─────────────────────────────────────────────────────────────────────
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return _ok({"success": True, "message": "User profile retrieved.", "user": profile_payload(request.user)})


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request) -> Response:
        data = request.data
        provided = {k: data.get(k) for k in [*PROFILE_FIELDS, "email"] if data.get(k) not in (None, "")}
        if not provided:
            return _err("At least one field is required to update.")
        profile, _ = Profile.objects.get_or_create(user=request.user)
        for field in PROFILE_FIELDS:
            if field in provided:
                setattr(profile, field, provided[field])
        profile.save()
        if "email" in provided:
            request.user.email = provided["email"]
            request.user.save(update_fields=["email", "updated_at"])
        record_activity(request.user, "profile_update", "Updated profile")
        return _ok(
            {"success": True, "message": "Profile updated successfully.", "user": profile_payload(request.user)}
        )


# ─── Details ─────────────────────────────────────────────────────────────────────
class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        user = User.objects.filter(pk=pk, deleted_at__isnull=True).first()
        if user is None:
            return _err("User not found")
        return _ok({"success": True, "message": "User details fetched.", "user": user_detail_payload(user)})


class ConsultantDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        user = User.objects.filter(pk=pk, role=Role.CONSULTANT, deleted_at__isnull=True).first()
        if user is None:
            return _err("Consultant not found")
        return _ok({"success": True, "message": "Consultant details fetched.", "consultant": consultant_detail_payload(user)})


class ConsultantsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return _ok(list_consultants(request.query_params))


class UsersListView(APIView):
    permission_classes = [IsAdminRole]  # lists every user's PII — admin only

    def get(self, request: Request) -> Response:
        return _ok(list_users(request.query_params))


# ─── Delete (admin) ──────────────────────────────────────────────────────────────
class DeleteUserView(APIView):
    permission_classes = [IsAdminRole]

    def delete(self, request: Request, pk) -> Response:
        user = User.objects.filter(pk=pk, deleted_at__isnull=True).first()
        if user is None:
            return _err("User not found")
        user.delete()  # soft delete + deactivate
        record_audit(request.user, "user.delete", target_type="User", target_id=pk, ip=client_ip(request))
        return _ok({"success": True, "message": "User deleted."})


class DeleteConsultantView(APIView):
    permission_classes = [IsAdminRole]

    def delete(self, request: Request, pk) -> Response:
        user = User.objects.filter(pk=pk, role=Role.CONSULTANT, deleted_at__isnull=True).first()
        if user is None:
            return _err("Consultant not found")
        user.delete()
        record_audit(request.user, "consultant.delete", target_type="User", target_id=pk, ip=client_ip(request))
        return _ok({"success": True, "message": "Consultant deleted."})


# ─── Push tokens (owner = request.user) ──────────────────────────────────────────
class _SavePushTokenBase(APIView):
    permission_classes = [IsAuthenticated]
    ok_message = "Push token saved"

    def post(self, request: Request) -> Response:
        token = request.data.get("pushToken")
        if not token:
            return _err("pushToken is required")
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.push_token = token
        profile.save(update_fields=["push_token"])
        return _ok({"success": True, "message": self.ok_message})


class PushTokenView(_SavePushTokenBase):
    ok_message = "Push token saved"


class ConsultantPushTokenView(_SavePushTokenBase):
    ok_message = "Consultant push token saved"


# ─── Send notification (admin; delivery deferred to R6, row persisted) ───────────
class _SendNotificationBase(APIView):
    permission_classes = [IsAdminRole]
    id_field = "userId"

    def post(self, request: Request) -> Response:
        recipient_id = request.data.get(self.id_field)
        title, body = request.data.get("title"), request.data.get("body")
        if not recipient_id or not title or not body:
            return _err(f"{self.id_field}, title, and body are required")
        Notification.objects.create(
            recipient_id=recipient_id, title=title, body=body, data=request.data.get("data") or {}
        )
        record_audit(
            request.user, "notification.send", target_type="User", target_id=recipient_id, ip=client_ip(request)
        )
        return _ok({"success": True, "message": "Notification queued"})


class SendNotificationView(_SendNotificationBase):
    id_field = "userId"


class ConsultantSendNotificationView(_SendNotificationBase):
    id_field = "consultantId"


# ─── Notifications ───────────────────────────────────────────────────────────────
class SaveNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        Notification.objects.create(
            recipient=request.user,
            title=request.data.get("title"),
            body=request.data.get("body"),
            data=request.data.get("data") or {},
        )
        return _ok({"success": True, "message": "Notification saved"})


class NotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        rows = Notification.objects.filter(recipient=request.user).order_by("-created_at")[:50]
        return _ok({"success": True, "notifications": [notification_payload(n) for n in rows]})


class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        notification_id = request.data.get("notificationId")
        if not notification_id:
            return _err("notificationId is required")
        # Ownership: only the recipient can mark their notification read.
        Notification.objects.filter(pk=notification_id, recipient=request.user).update(is_read=True)
        return _ok({"success": True})


class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request) -> Response:
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.notifications_enabled = bool(request.data.get("enabled"))
        profile.save(update_fields=["notifications_enabled"])
        return _ok({"success": True, "message": "Notification preference updated."})
