# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "actor", "target_type", "target_id", "ip_address")
    list_filter = ("action", "target_type")
    search_fields = ("action", "target_id", "actor__email")
    readonly_fields = ("id", "actor", "action", "target_type", "target_id", "metadata", "ip_address", "created_at")

    def has_add_permission(self, request):
        return False  # audit entries are append-only, written by the app

    def has_change_permission(self, request, obj=None):
        return False
