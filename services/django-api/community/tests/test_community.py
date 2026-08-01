# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Community feed tests (Stillwater P4) — posts, likes, comments, ownership, pseudonymity."""
from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from accounts.models import Profile, Role, User
from community.models import CommunityComment, CommunityLike, CommunityPost

pytestmark = pytest.mark.django_db


def make(email, username=None, role=Role.USER):
    u = User.objects.create_user(email=email, password="correct-horse-9", role=role)
    Profile.objects.create(user=u, username=username or email.split("@")[0], first_name="Real", last_name="Name")
    return u


def client_for(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


def test_create_and_feed_shows_pseudonymous_author():
    author = make("a@forus.app", username="calm_otter_12")
    resp = client_for(author).post("/api/community/posts", {"content": "hello world"}, format="json")
    assert resp.status_code == 201
    assert resp.data["post"]["content"] == "hello world"

    feed = client_for(make("v@forus.app")).get("/api/community/posts")
    assert feed.status_code == 200
    post = feed.data["posts"][0]
    assert post["author"]["username"] == "calm_otter_12"  # handle, not real name
    assert "Real" not in str(post["author"])  # no real name leaks
    assert post["like_count"] == 0 and post["comment_count"] == 0 and post["liked"] is False


def test_empty_content_rejected():
    resp = client_for(make("a@forus.app")).post("/api/community/posts", {"content": "   "}, format="json")
    assert resp.status_code == 400


def test_like_is_idempotent_and_unlike():
    author = make("a@forus.app")
    pid = client_for(author).post("/api/community/posts", {"content": "x"}, format="json").data["post"]["id"]
    liker = client_for(make("l@forus.app"))

    r1 = liker.post(f"/api/community/posts/{pid}/like")
    r2 = liker.post(f"/api/community/posts/{pid}/like")  # again — no duplicate
    assert r1.data["like_count"] == 1 and r2.data["like_count"] == 1
    assert CommunityLike.objects.filter(post_id=pid).count() == 1

    un = liker.delete(f"/api/community/posts/{pid}/like")
    assert un.data["liked"] is False and un.data["like_count"] == 0


def test_liked_flag_reflects_caller():
    author = make("a@forus.app")
    pid = client_for(author).post("/api/community/posts", {"content": "x"}, format="json").data["post"]["id"]
    liker = client_for(make("l@forus.app"))
    liker.post(f"/api/community/posts/{pid}/like")
    assert liker.get(f"/api/community/posts/{pid}").data["post"]["liked"] is True
    assert client_for(make("other@forus.app")).get(f"/api/community/posts/{pid}").data["post"]["liked"] is False


def test_comments_flow_and_counts():
    author = make("a@forus.app")
    ac = client_for(author)
    pid = ac.post("/api/community/posts", {"content": "x"}, format="json").data["post"]["id"]
    ac.post(f"/api/community/posts/{pid}/comments", {"content": "nice"}, format="json")
    commenter = client_for(make("c@forus.app", username="brave_finch_7"))
    commenter.post(f"/api/community/posts/{pid}/comments", {"content": "agreed"}, format="json")

    listing = ac.get(f"/api/community/posts/{pid}/comments")
    assert [c["content"] for c in listing.data["comments"]] == ["nice", "agreed"]
    assert listing.data["comments"][1]["author"]["username"] == "brave_finch_7"
    assert ac.get(f"/api/community/posts/{pid}").data["post"]["comment_count"] == 2


def test_delete_post_owner_or_admin_only():
    author = make("a@forus.app")
    pid = client_for(author).post("/api/community/posts", {"content": "x"}, format="json").data["post"]["id"]

    assert client_for(make("stranger@forus.app")).delete(f"/api/community/posts/{pid}").status_code == 403
    assert client_for(author).delete(f"/api/community/posts/{pid}").status_code == 200
    # Soft-deleted → gone from the feed and 404 on detail.
    assert CommunityPost.objects.filter(pk=pid).exists() is False
    assert CommunityPost.all_objects.get(pk=pid).deleted_at is not None
    assert client_for(author).get(f"/api/community/posts/{pid}").status_code == 404


def test_admin_can_delete_any_comment():
    author = make("a@forus.app")
    pid = client_for(author).post("/api/community/posts", {"content": "x"}, format="json").data["post"]["id"]
    cid = client_for(author).post(
        f"/api/community/posts/{pid}/comments", {"content": "mine"}, format="json"
    ).data["comment"]["id"]
    admin = make("admin@forus.app", role=Role.ADMIN)
    assert client_for(admin).delete(f"/api/community/comments/{cid}").status_code == 200
    assert CommunityComment.objects.filter(pk=cid).exists() is False


def test_feed_requires_auth():
    assert APIClient().get("/api/community/posts").status_code == 401
