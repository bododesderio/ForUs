# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin

from .models import ChatMember, ChatMessage, ChatRoom, MessageReaction


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "type", "created_by", "created_at")
    list_filter = ("type",)
    search_fields = ("name",)
    raw_id_fields = ("created_by",)


@admin.register(ChatMember)
class ChatMemberAdmin(admin.ModelAdmin):
    list_display = ("room", "user", "role", "joined_at")
    list_filter = ("role",)
    raw_id_fields = ("room", "user")


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "user", "reply_count", "created_at")
    search_fields = ("text", "user__email")
    raw_id_fields = ("room", "user")


@admin.register(MessageReaction)
class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ("message", "user", "reaction_type", "created_at")
    list_filter = ("reaction_type",)
    raw_id_fields = ("message", "user")
