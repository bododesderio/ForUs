# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Community feed routes, mounted at /api/community/ (Stillwater P4)."""
from django.urls import path

from .views import CommentDeleteView, CommentsView, FeedView, LikeView, PostDetailView

urlpatterns = [
    path("posts", FeedView.as_view(), name="community-feed"),  # GET feed / POST create
    path("posts/<uuid:pk>", PostDetailView.as_view(), name="community-post"),
    path("posts/<uuid:pk>/like", LikeView.as_view(), name="community-like"),
    path("posts/<uuid:pk>/comments", CommentsView.as_view(), name="community-comments"),
    path("comments/<uuid:pk>", CommentDeleteView.as_view(), name="community-comment-delete"),
]
