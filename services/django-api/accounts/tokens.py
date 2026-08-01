# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
JWT issuance for the auth tier (SimpleJWT).

Access 15m / refresh 7d with rotation + blacklist (SEC-3, configured in settings).
Both tokens carry `email` and `role` claims so the FastAPI realtime tier can authorize
from the token alone (R4) without a DB round-trip. Token payloads mirror the Node
`{id, email, role}` shape for a clean cutover.
"""
from __future__ import annotations

from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


def tokens_for_user(user: User) -> tuple[str, str]:
    """Return (access, refresh) JWT strings with email/role claims on both."""
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    refresh["role"] = user.role
    access = refresh.access_token
    access["email"] = user.email
    access["role"] = user.role
    return str(access), str(refresh)
