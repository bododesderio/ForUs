# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Shared DRF permissions. Role gates return 403 (never a hanging non-response — BUG-4)."""
from __future__ import annotations

from rest_framework.permissions import BasePermission

from accounts.models import Role

ADMIN_ROLES = frozenset({Role.ADMIN, Role.SUPER_ADMIN})


class IsAdminRole(BasePermission):
    """Authenticated user whose role is admin/super_admin. Non-admins → 403."""

    message = "Admin privileges are required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role in ADMIN_ROLES)


class IsConsultantRole(BasePermission):
    """Authenticated consultant. Reserved for consultant-only actions."""

    message = "Consultant privileges are required."

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and user.role == Role.CONSULTANT)
