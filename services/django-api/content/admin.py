# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin

from .models import Event, Notification, Resource


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "category", "consultant", "downloads", "rating", "created_at")
    list_filter = ("type", "category")
    search_fields = ("title", "author", "consultant__email")
    raw_id_fields = ("consultant",)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "event_date", "location", "organizer", "status")
    list_filter = ("status",)
    date_hierarchy = "event_date"
    search_fields = ("title", "organizer", "location")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("recipient", "title", "is_read", "created_at")
    list_filter = ("is_read",)
    search_fields = ("recipient__email", "title")
    raw_id_fields = ("recipient",)
