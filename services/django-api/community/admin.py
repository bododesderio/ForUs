# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
from django.contrib import admin

from .models import CommunityComment, CommunityLike, CommunityPost


@admin.register(CommunityPost)
class CommunityPostAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at")
    search_fields = ("user__email", "content")
    raw_id_fields = ("user",)


@admin.register(CommunityLike)
class CommunityLikeAdmin(admin.ModelAdmin):
    list_display = ("post", "user", "created_at")
    raw_id_fields = ("post", "user")


@admin.register(CommunityComment)
class CommunityCommentAdmin(admin.ModelAdmin):
    list_display = ("post", "user", "created_at")
    search_fields = ("user__email", "content")
    raw_id_fields = ("post", "user")
