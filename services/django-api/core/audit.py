# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Audit-trail helper (P9). Recording is best-effort — never break the primary action."""
from __future__ import annotations

import logging

logger = logging.getLogger("forus.audit")


def client_ip(request) -> str | None:
    """Caller IP, honouring the gateway's X-Forwarded-For (first hop)."""
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def record_audit(
    actor,
    action: str,
    *,
    target_type: str | None = None,
    target_id=None,
    metadata: dict | None = None,
    ip: str | None = None,
) -> None:
    from .models import AuditLog

    try:
        AuditLog.objects.create(
            actor=actor if (actor is not None and getattr(actor, "is_authenticated", False)) else None,
            action=action,
            target_type=target_type or "",
            target_id=str(target_id) if target_id is not None else None,
            metadata=metadata or {},
            ip_address=ip,
        )
    except Exception:  # pragma: no cover - audit must not mask the operation it records
        logger.warning("audit_record_failed", extra={"action": action})
