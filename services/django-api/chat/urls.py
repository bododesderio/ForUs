# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Chat REST routes, mounted at /api/chat/ — paths mirror the Node backend.

`/token` (Stream) and `/webhook` (Stream) are intentionally gone: token issuance
becomes a WS ticket in R4b, and realtime no longer uses a provider webhook.
"""
from django.urls import path

from .views import JoinRoomView, RoomMessagesView, RoomsView

urlpatterns = [
    path("rooms", RoomsView.as_view(), name="chat-rooms"),  # POST create / GET list
    path("rooms/<uuid:room_id>/messages", RoomMessagesView.as_view(), name="chat-room-messages"),
    path("rooms/<uuid:room_id>/join", JoinRoomView.as_view(), name="chat-room-join"),
]
