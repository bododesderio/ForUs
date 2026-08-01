# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Chat domain: rooms, membership, messages, reactions.

The source schema used Stream Chat string IDs as PKs; the re-platform owns realtime
in FastAPI, so IDs become server-issued UUIDs like the rest of the schema. `parent_id`
stays a loose pointer (the source declared no FK) to keep thread inserts order-free.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models import CreatedModel, SoftDeleteModel, TimeStampedModel, UUIDModel


class ChatRoomType(models.TextChoices):
    MESSAGING = "messaging", "Messaging"
    LIVESTREAM = "livestream", "Livestream"
    TEAM = "team", "Team"


class ChatMemberRole(models.TextChoices):
    MEMBER = "member", "Member"
    MODERATOR = "moderator", "Moderator"
    ADMIN = "admin", "Admin"
    OWNER = "owner", "Owner"


class ChatRoom(UUIDModel, TimeStampedModel):
    """Source table `chat_rooms`."""

    name = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(
        max_length=20, choices=ChatRoomType.choices, default=ChatRoomType.MESSAGING, null=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        db_column="created_by",
        related_name="created_rooms",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "chat_rooms"

    def __str__(self) -> str:
        return self.name or f"Room<{self.id}>"


class ChatMember(UUIDModel):
    """Source table `chat_members`. One membership row per (room, user)."""

    room = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, db_column="room_id", related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="chat_memberships",
    )
    role = models.CharField(
        max_length=20, choices=ChatMemberRole.choices, default=ChatMemberRole.MEMBER, null=True
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_members"
        constraints = [
            models.UniqueConstraint(fields=["room", "user"], name="chat_members_room_user_uniq")
        ]

    def __str__(self) -> str:
        return f"Member<{self.user_id}>@{self.room_id}"


class ChatMessage(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """Source table `chat_messages`."""

    room = models.ForeignKey(
        ChatRoom, on_delete=models.CASCADE, db_column="room_id", related_name="messages"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="chat_messages",
    )
    text = models.TextField(null=True, blank=True)
    attachments = models.JSONField(default=list)
    mentioned_users = models.JSONField(default=list)
    parent_id = models.UUIDField(null=True, blank=True)  # loose thread pointer (no FK in source)
    reaction_counts = models.JSONField(default=dict)
    reply_count = models.IntegerField(default=0)

    class Meta:
        db_table = "chat_messages"
        indexes = [
            models.Index(fields=["room", "created_at"], name="chat_messages_room_created_idx"),
            models.Index(fields=["user", "created_at"], name="chat_messages_user_created_idx"),
        ]

    def __str__(self) -> str:
        return f"Message<{self.id}>@{self.room_id}"


class MessageReaction(UUIDModel, CreatedModel):
    """Source table `message_reactions`. One reaction per (message, user, type)."""

    message = models.ForeignKey(
        ChatMessage, on_delete=models.CASCADE, db_column="message_id", related_name="reactions"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="message_reactions",
    )
    reaction_type = models.CharField(max_length=50)

    class Meta:
        db_table = "message_reactions"
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user", "reaction_type"],
                name="message_reactions_msg_user_type_uniq",
            )
        ]

    def __str__(self) -> str:
        return f"{self.reaction_type}<{self.message_id}>"
