# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""Offline invariants for the shared Core reflection registry (no DB required)."""
from __future__ import annotations

from libs.db import tables


def test_forus_tables_cover_the_nineteen_domain_tables() -> None:
    assert len(tables.FORUS_TABLES) == 19
    assert len(set(tables.FORUS_TABLES)) == 19  # no duplicates


def test_refresh_tokens_is_excluded() -> None:
    # Its semantics moved to SimpleJWT's token_blacklist app.
    assert "refresh_tokens" not in tables.FORUS_TABLES


def test_reflect_exposes_the_shared_metadata_registry() -> None:
    # reflect() returns the same process-wide MetaData that table() reads from.
    assert tables.metadata is not None
    assert callable(tables.reflect)
    assert callable(tables.table)
