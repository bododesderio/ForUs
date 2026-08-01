# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import UserChangeForm, UserCreationForm
from .models import (
    Activity,
    AdminDetails,
    ConsultantDetails,
    PasswordResetToken,
    Profile,
    User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    ordering = ("email",)
    list_display = ("email", "role", "is_active", "email_verified", "is_staff", "created_at")
    list_filter = ("role", "is_active", "email_verified", "is_staff")
    search_fields = ("email",)
    readonly_fields = ("id", "created_at", "updated_at", "last_login", "deleted_at")
    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Role & status", {"fields": ("role", "is_active", "email_verified", "tos_accepted_at")}),
        ("Permissions", {"fields": ("is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Timestamps", {"fields": ("last_login", "created_at", "updated_at", "deleted_at")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "password1", "password2", "role")}),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "username", "first_name", "last_name", "phone")
    search_fields = ("username", "first_name", "last_name", "phone", "user__email")
    raw_id_fields = ("user",)


@admin.register(ConsultantDetails)
class ConsultantDetailsAdmin(admin.ModelAdmin):
    list_display = ("user", "profession", "experience", "rating", "is_approved")
    list_filter = ("is_approved",)
    search_fields = ("user__email", "profession")
    raw_id_fields = ("user",)


@admin.register(AdminDetails)
class AdminDetailsAdmin(admin.ModelAdmin):
    list_display = ("user", "department", "access_level", "last_login")
    list_filter = ("access_level",)
    raw_id_fields = ("user",)


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "created_at")
    list_filter = ("type",)
    search_fields = ("user__email", "description")
    raw_id_fields = ("user",)


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "expires_at", "used_at", "created_at")
    raw_id_fields = ("user",)
