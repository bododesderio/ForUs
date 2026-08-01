# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin

from .models import Appointment, Review


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "consultant", "appointment_datetime", "status", "duration_minutes")
    list_filter = ("status",)
    date_hierarchy = "appointment_datetime"
    search_fields = ("title", "user__email", "consultant__email")
    raw_id_fields = ("user", "consultant")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("appointment", "user", "consultant", "rating", "created_at")
    list_filter = ("rating",)
    raw_id_fields = ("appointment", "user", "consultant")
