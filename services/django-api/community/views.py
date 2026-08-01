# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Community feed endpoints (Stillwater P4) on the R1 community_* models."""
from __future__ import annotations

from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Profile
from core.permissions import ADMIN_ROLES

from .models import CommunityComment, CommunityLike, CommunityPost
from .serializers import CommentCreateSerializer, PostCreateSerializer
from .services import comment_payload, feed_page, single_post_payload


def _owns_or_admin(request, owner_id) -> bool:
    return str(request.user.id) == str(owner_id) or request.user.role in ADMIN_ROLES


def _not_found():
    return Response({"success": False, "message": "Post not found"}, status=http.HTTP_404_NOT_FOUND)


class FeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(feed_page(request.user, request.query_params), status=http.HTTP_200_OK)

    def post(self, request: Request) -> Response:
        ser = PostCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        post = CommunityPost.objects.create(
            user=request.user,
            content=ser.validated_data["content"],
            image_url=ser.validated_data.get("image_url"),
        )
        return Response(
            {"success": True, "post": single_post_payload(post, request.user)},
            status=http.HTTP_201_CREATED,
        )


class PostDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        post = CommunityPost.objects.filter(pk=pk).first()
        if post is None:
            return _not_found()
        return Response({"success": True, "post": single_post_payload(post, request.user)}, status=http.HTTP_200_OK)

    def delete(self, request: Request, pk) -> Response:
        post = CommunityPost.objects.filter(pk=pk).first()
        if post is None:
            return _not_found()
        if not _owns_or_admin(request, post.user_id):
            return Response({"success": False, "message": "Not authorized"}, status=http.HTTP_403_FORBIDDEN)
        post.delete()  # soft delete
        return Response({"success": True, "message": "Post deleted"}, status=http.HTTP_200_OK)


class LikeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk) -> Response:
        post = CommunityPost.objects.filter(pk=pk).first()
        if post is None:
            return _not_found()
        CommunityLike.objects.get_or_create(post=post, user=request.user)  # idempotent
        return Response(
            {"success": True, "liked": True, "like_count": CommunityLike.objects.filter(post=post).count()},
            status=http.HTTP_200_OK,
        )

    def delete(self, request: Request, pk) -> Response:
        CommunityLike.objects.filter(post_id=pk, user=request.user).delete()
        return Response(
            {"success": True, "liked": False, "like_count": CommunityLike.objects.filter(post_id=pk).count()},
            status=http.HTTP_200_OK,
        )


class CommentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk) -> Response:
        if not CommunityPost.objects.filter(pk=pk).exists():
            return _not_found()
        comments = list(CommunityComment.objects.filter(post_id=pk).order_by("created_at"))
        profiles = {
            p.user_id: p
            for p in Profile.objects.filter(user_id__in={c.user_id for c in comments})
        }
        return Response(
            {"success": True, "comments": [comment_payload(c, profiles) for c in comments]},
            status=http.HTTP_200_OK,
        )

    def post(self, request: Request, pk) -> Response:
        post = CommunityPost.objects.filter(pk=pk).first()
        if post is None:
            return _not_found()
        ser = CommentCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        comment = CommunityComment.objects.create(
            post=post, user=request.user, content=ser.validated_data["content"]
        )
        profiles = {request.user.id: Profile.objects.filter(user_id=request.user.id).first()}
        return Response(
            {"success": True, "comment": comment_payload(comment, profiles)},
            status=http.HTTP_201_CREATED,
        )


class CommentDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, pk) -> Response:
        comment = CommunityComment.objects.filter(pk=pk).first()
        if comment is None:
            return Response({"success": False, "message": "Comment not found"}, status=http.HTTP_404_NOT_FOUND)
        if not _owns_or_admin(request, comment.user_id):
            return Response({"success": False, "message": "Not authorized"}, status=http.HTTP_403_FORBIDDEN)
        comment.delete()
        return Response({"success": True, "message": "Comment deleted"}, status=http.HTTP_200_OK)
