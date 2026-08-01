# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Serializers for the content domain (events + resources)."""
from __future__ import annotations

from rest_framework import serializers

from .models import Event, Resource, ResourceType


class EventSerializer(serializers.ModelSerializer):
    """Output shape — mirrors the Node `SELECT *` event row."""

    class Meta:
        model = Event
        fields = "__all__"


class EventCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    event_date = serializers.DateTimeField()
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    location = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)
    organizer = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)


class EventUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False)
    event_date = serializers.DateTimeField(required=False)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    location = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)
    organizer = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)


class ResourceSerializer(serializers.ModelSerializer):
    """Output shape for the public resource list."""

    class Meta:
        model = Resource
        fields = "__all__"


class ResourceUploadSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    type = serializers.ChoiceField(choices=ResourceType.choices)
    file_url = serializers.CharField(max_length=500)
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    category = serializers.CharField(max_length=100, required=False, allow_null=True, allow_blank=True)
    preview_image_url = serializers.CharField(
        max_length=500, required=False, allow_null=True, allow_blank=True
    )
    author = serializers.CharField(max_length=255, required=False, allow_null=True, allow_blank=True)
    duration = serializers.CharField(max_length=50, required=False, allow_null=True, allow_blank=True)
