# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Auth endpoints (DRF), ported from the Node `/api/auth/*` surface with response parity.

- Register/login/refresh/logout are public; change-password/push-token require a token.
- SEC-1: push-token owner is `request.user`, never the body.
- SEC-3: refresh rotates + blacklists; replay of a rotated token is rejected.
- BUG-2/BUG-3: every path returns a response; invalid input → 400 via serializer validation.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, User
from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    PushTokenSerializer,
    RefreshSerializer,
    RegisterConsultantSerializer,
    RegisterUserSerializer,
    build_user_payload,
)
from .services import record_activity, register_consultant, register_user
from .tokens import tokens_for_user


class RegisterUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        ser = RegisterUserSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = register_user(
            email=ser.validated_data["email"],
            password=ser.validated_data["password"],
            username=ser.validated_data["username"],
            profile_image=ser.validated_data.get("profile_image"),
        )
        return Response(
            {"success": True, "message": "User Registered Successfully.", "user": build_user_payload(user)},
            status=status.HTTP_201_CREATED,
        )


class RegisterConsultantView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        ser = RegisterConsultantSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = register_consultant(
            email=ser.validated_data["email"],
            password=ser.validated_data["password"],
            username=ser.validated_data["username"],
            first_name=ser.validated_data.get("first_name"),
            last_name=ser.validated_data.get("last_name"),
        )
        # Status 200 mirrors the Node consultant endpoint (user register returns 201).
        return Response(
            {"success": True, "message": "Consultant Registered Successfully.", "user": build_user_payload(user)},
            status=status.HTTP_200_OK,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"]
        password = ser.validated_data["password"]

        user = User.objects.filter(email__iexact=email, deleted_at__isnull=True).first()
        if user is None:
            return self._fail("User does not exist.")
        if not user.is_active:
            return self._fail("Account is deactivated.")
        if not user.check_password(password):
            return self._fail("Invalid credentials.")

        access, refresh = tokens_for_user(user)
        record_activity(user, "login", "User logged in")
        return Response(
            {
                "success": True,
                "message": "Login Successful",
                "user": build_user_payload(user),
                "accessToken": access,
                "refreshToken": refresh,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _fail(message: str) -> Response:
        # Node returns 400 for every login failure — matched so the harness diffs clean.
        return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)


class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        ser = RefreshSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            # Construction verifies signature/expiry AND rejects an already-blacklisted
            # (previously rotated) token — that is the reuse detection (SEC-3).
            old = RefreshToken(ser.validated_data["refreshToken"])
        except TokenError:
            return Response(
                {"success": False, "message": "Invalid or expired refresh token"},
                status=status.HTTP_403_FORBIDDEN,
            )
        old.blacklist()  # rotate: the presented token can never be reused
        user = User.objects.filter(pk=old.get("user_id"), deleted_at__isnull=True).first()
        if user is None or not user.is_active:
            return Response(
                {"success": False, "message": "Invalid or expired refresh token"},
                status=status.HTTP_403_FORBIDDEN,
            )
        access, refresh = tokens_for_user(user)
        return Response(
            {"success": True, "accessToken": access, "refreshToken": refresh},
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        ser = LogoutSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            RefreshToken(ser.validated_data["refreshToken"]).blacklist()
        except TokenError:
            pass  # already invalid/expired — logout is idempotent
        return Response(
            {"success": True, "message": "Logged out successfully"}, status=status.HTTP_200_OK
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        ser = ChangePasswordSerializer(data=request.data, context={"user": request.user})
        ser.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(ser.validated_data["currentPassword"]):
            return Response(
                {"success": False, "message": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(ser.validated_data["newPassword"])
        user.save(update_fields=["password", "updated_at"])
        record_activity(user, "change_password", "Password changed")
        return Response(
            {"success": True, "message": "Password changed successfully."}, status=status.HTTP_200_OK
        )


class PushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        ser = PushTokenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.push_token = ser.validated_data["pushToken"]
        profile.save(update_fields=["push_token"])
        return Response({"message": "Push token saved successfully"}, status=status.HTTP_200_OK)
