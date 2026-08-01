# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Auth serializers + the `user` response payload.

Request/response field names mirror the Node backend so the Expo app needs no change
at cutover (parity harness is the gate). Identity for authenticated actions comes from
the token, never the request body (SEC-1).
"""
from __future__ import annotations

from django.contrib.auth import password_validation
from django.db.models import Avg, Count
from rest_framework import serializers

from .models import ConsultantDetails, Profile, Role, User


def build_user_payload(user: User) -> dict:
    """The `user` object returned by login/register — user + profile (+ consultant details)."""
    profile = Profile.objects.filter(user=user).first()
    payload: dict = {
        "id": str(user.id),
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "username": getattr(profile, "username", None),
        "first_name": getattr(profile, "first_name", None),
        "last_name": getattr(profile, "last_name", None),
        "profile_image": getattr(profile, "profile_image", None),
        "push_token": getattr(profile, "push_token", None),
    }
    if user.role == Role.CONSULTANT:
        cd = ConsultantDetails.objects.filter(user=user).first()
        if cd is not None:
            from appointments.models import Review

            agg = Review.objects.filter(consultant=user).aggregate(
                total_reviews=Count("id"), average_rating=Avg("rating")
            )
            payload.update(
                {
                    "profession": cd.profession,
                    "experience": cd.experience,
                    "education": cd.education,
                    "language": cd.language,
                    "available_from": cd.available_from.isoformat() if cd.available_from else None,
                    "available_to": cd.available_to.isoformat() if cd.available_to else None,
                    "available_days": cd.available_days,
                    "rating": cd.rating,
                    "is_approved": cd.is_approved,
                    "total_reviews": agg["total_reviews"] or 0,
                    "average_rating": round(agg["average_rating"] or 0, 2),
                }
            )
    return payload


class RegisterUserSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=100)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    profile_image = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value.lower()

    def validate_password(self, value: str) -> str:
        password_validation.validate_password(value)
        return value


class RegisterConsultantSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    first_name = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    last_name = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
    email = serializers.EmailField(max_length=100)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value.lower()

    def validate_password(self, value: str) -> str:
        password_validation.validate_password(value)
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True, trim_whitespace=False)
    newPassword = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_newPassword(self, value: str) -> str:
        password_validation.validate_password(value, self.context.get("user"))
        return value


class PushTokenSerializer(serializers.Serializer):
    # No user id in the body (SEC-1) — the owner is request.user.
    pushToken = serializers.CharField(max_length=255)


class RefreshSerializer(serializers.Serializer):
    refreshToken = serializers.CharField()


class LogoutSerializer(serializers.Serializer):
    refreshToken = serializers.CharField()
