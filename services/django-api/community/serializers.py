# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Input serializers for the community feed. Length caps stand in for moderation (P7)."""
from __future__ import annotations

from rest_framework import serializers

MAX_POST_LEN = 5000
MAX_COMMENT_LEN = 2000


class PostCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=MAX_POST_LEN, trim_whitespace=True)
    image_url = serializers.CharField(max_length=500, required=False, allow_null=True, allow_blank=True)


class CommentCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=MAX_COMMENT_LEN, trim_whitespace=True)
