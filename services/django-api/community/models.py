# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Community feed domain: posts, likes, comments.

Schema-only in the source (no routes existed, ARCH-4). Modeled here so the schema
is complete and reversible; endpoints/UI are wired by Stillwater Phase 4.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models

from core.models import CreatedModel, SoftDeleteModel, TimeStampedModel, UUIDModel


class CommunityPost(UUIDModel, TimeStampedModel, SoftDeleteModel):
    """Source table `community_posts`."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="community_posts",
    )
    content = models.TextField()
    image_url = models.CharField(max_length=500, null=True, blank=True)

    class Meta:
        db_table = "community_posts"

    def __str__(self) -> str:
        return f"Post<{self.id}>"


class CommunityLike(UUIDModel, CreatedModel):
    """Source table `community_likes`. One like per (post, user)."""

    post = models.ForeignKey(
        CommunityPost, on_delete=models.CASCADE, db_column="post_id", related_name="likes"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="community_likes",
    )

    class Meta:
        db_table = "community_likes"
        constraints = [
            models.UniqueConstraint(fields=["post", "user"], name="community_likes_post_user_uniq")
        ]

    def __str__(self) -> str:
        return f"Like<{self.post_id}> by {self.user_id}"


class CommunityComment(UUIDModel, CreatedModel):
    """Source table `community_comments`."""

    post = models.ForeignKey(
        CommunityPost, on_delete=models.CASCADE, db_column="post_id", related_name="comments"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="community_comments",
    )
    content = models.TextField()

    class Meta:
        db_table = "community_comments"

    def __str__(self) -> str:
        return f"Comment<{self.id}>"
