# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin

from .models import Mood


@admin.register(Mood)
class MoodAdmin(admin.ModelAdmin):
    list_display = ("user", "mood_date", "mood", "created_at")
    date_hierarchy = "mood_date"
    search_fields = ("user__email",)
    raw_id_fields = ("user",)
