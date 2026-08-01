# @author Bodo Desderio <rooiboktechltd@gmail.com>
# @copyright 2026 Rooibok Technologies. All rights reserved.
"""
Shared DB access for the Python backend.

Django (services/django-api) owns the schema via migrations — the single source of
truth (ARCH-1). FastAPI (services/fastapi-rt) reads the same PostgreSQL via SQLAlchemy
Core reflections defined here in R1; it never runs DDL.

R0 ships the package placeholder. R1 adds `tables.py` (reflected Core `Table` objects)
and any shared connection helpers imported by the realtime tier.
"""
