# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Content routes (events + resources), mounted under /api/ — paths mirror the Node backend."""
from django.urls import path

from .views import (
    EventCreateView,
    EventDeleteView,
    EventDetailView,
    EventListView,
    EventUpdateView,
    ResourceListView,
    ResourceUploadView,
)

urlpatterns = [
    # Events
    path("events/create", EventCreateView.as_view(), name="event-create"),
    path("events/get", EventListView.as_view(), name="event-list"),
    path("events/details/<uuid:pk>", EventDetailView.as_view(), name="event-detail"),
    path("events/delete/<uuid:pk>", EventDeleteView.as_view(), name="event-delete"),
    path("events/update/<uuid:pk>", EventUpdateView.as_view(), name="event-update"),
    # Resources
    path("resources", ResourceListView.as_view(), name="resource-list"),
    path("resources/upload", ResourceUploadView.as_view(), name="resource-upload"),
]
