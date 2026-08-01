# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Appointment routes, mounted at /api/appointments/ — paths mirror the Node backend."""
from django.urls import path

from .views import (
    AllAppointmentsView,
    BlockSlotView,
    CancelView,
    ConfirmView,
    ConsultantAppointmentsView,
    ConsultantAvailabilityView,
    ConsultantReviewsView,
    CreateAppointmentView,
    MyAppointmentsView,
    RejectView,
    RescheduleView,
    ReviewView,
    StartSessionView,
    UpdateStatusView,
    UserAppointmentsView,
)

urlpatterns = [
    path("create", CreateAppointmentView.as_view(), name="appointment-create"),
    path("get", MyAppointmentsView.as_view(), name="appointment-mine"),
    path("all", AllAppointmentsView.as_view(), name="appointment-all"),
    path("block", BlockSlotView.as_view(), name="appointment-block"),
    path("user/<uuid:user_id>", UserAppointmentsView.as_view(), name="appointment-user"),
    path(
        "consultant/<uuid:consultant_id>/availability",
        ConsultantAvailabilityView.as_view(),
        name="appointment-availability",
    ),
    path("consultant/<uuid:consultant_id>", ConsultantAppointmentsView.as_view(), name="appointment-consultant"),
    path("consultants/<uuid:consultant_id>/reviews", ConsultantReviewsView.as_view(), name="consultant-reviews"),
    path("<uuid:pk>/status", UpdateStatusView.as_view(), name="appointment-status"),
    path("<uuid:pk>/review", ReviewView.as_view(), name="appointment-review"),
    path("<uuid:pk>/confirm", ConfirmView.as_view(), name="appointment-confirm"),
    path("<uuid:pk>/reject", RejectView.as_view(), name="appointment-reject"),
    path("<uuid:pk>/reschedule", RescheduleView.as_view(), name="appointment-reschedule"),
    path("<uuid:pk>/cancel", CancelView.as_view(), name="appointment-cancel"),
    path("<uuid:pk>/start-session", StartSessionView.as_view(), name="appointment-start-session"),
]
