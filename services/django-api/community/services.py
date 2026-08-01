# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Community feed payloads + queries (Stillwater P4) on the R1 `community_*` models.

Identity in the feed is pseudonymous — the author's `username` handle and avatar,
never their real name. Groups and typed reactions need new schema (follow-ups).
"""
from __future__ import annotations

import math

from django.db.models import Count

from accounts.models import Profile

from .models import CommunityComment, CommunityLike, CommunityPost


def _iso(v):
    return v.isoformat() if v is not None else None


def _author(profiles: dict, user_id) -> dict:
    p = profiles.get(user_id)
    return {
        "id": str(user_id),
        "username": getattr(p, "username", None),
        "profile_image": getattr(p, "profile_image", None),
    }


def post_payload(post: CommunityPost, profiles: dict, liked_ids: set) -> dict:
    return {
        "id": str(post.id),
        "content": post.content,
        "image_url": post.image_url,
        "created_at": _iso(post.created_at),
        "author": _author(profiles, post.user_id),
        "like_count": getattr(post, "like_count", 0),
        "comment_count": getattr(post, "comment_count", 0),
        "liked": post.id in liked_ids,
    }


def feed_page(user, params) -> dict:
    qs = (
        CommunityPost.objects.annotate(
            like_count=Count("likes", distinct=True),
            comment_count=Count("comments", distinct=True),
        )
        .order_by("-created_at")
    )
    try:
        page = max(int(params.get("page", 1)), 1)
        limit = min(max(int(params.get("limit", 20)), 1), 100)
    except (TypeError, ValueError):
        page, limit = 1, 20

    total = qs.count()
    offset = (page - 1) * limit
    posts = list(qs[offset : offset + limit])

    author_ids = {p.user_id for p in posts}
    profiles = {pr.user_id: pr for pr in Profile.objects.filter(user_id__in=author_ids)}
    liked_ids = set(
        CommunityLike.objects.filter(user=user, post__in=posts).values_list("post_id", flat=True)
    )
    return {
        "success": True,
        "posts": [post_payload(p, profiles, liked_ids) for p in posts],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": math.ceil(total / limit) if limit else 0,
        },
    }


def single_post_payload(post: CommunityPost, user) -> dict:
    post.like_count = CommunityLike.objects.filter(post=post).count()
    post.comment_count = CommunityComment.objects.filter(post=post).count()
    profiles = {post.user_id: Profile.objects.filter(user_id=post.user_id).first()}
    liked_ids = set(
        CommunityLike.objects.filter(user=user, post=post).values_list("post_id", flat=True)
    )
    return post_payload(post, profiles, liked_ids)


def comment_payload(comment: CommunityComment, profiles: dict) -> dict:
    return {
        "id": str(comment.id),
        "post_id": str(comment.post_id),
        "content": comment.content,
        "created_at": _iso(comment.created_at),
        "author": _author(profiles, comment.user_id),
    }
