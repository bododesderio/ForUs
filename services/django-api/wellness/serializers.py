# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Serializers for the wellness (mood) domain."""
from __future__ import annotations

from rest_framework import serializers


class MoodSetSerializer(serializers.Serializer):
    date = serializers.DateField()
    mood = serializers.IntegerField()
