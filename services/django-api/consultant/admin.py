# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin

from .models import SessionNote


@admin.register(SessionNote)
class SessionNoteAdmin(admin.ModelAdmin):
    list_display = ("appointment", "consultant", "shared_with_client", "updated_at")
    list_filter = ("shared_with_client",)
    raw_id_fields = ("appointment", "consultant")
