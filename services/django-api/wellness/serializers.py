# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Serializers for the wellness (mood) domain."""
from __future__ import annotations

from rest_framework import serializers


class MoodSetSerializer(serializers.Serializer):
    date = serializers.DateField()
    mood = serializers.IntegerField()
    # Rich check-in (P3) — all optional, backward-compatible with the R3a shape.
    mood_color = serializers.CharField(max_length=20, required=False, allow_null=True, allow_blank=True)
    feeling_tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    note = serializers.CharField(required=False, allow_null=True, allow_blank=True)
