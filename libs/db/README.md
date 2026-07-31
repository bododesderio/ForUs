<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# libs/db — shared data access

Django owns the PostgreSQL schema (migrations = source of truth). FastAPI reads it via
SQLAlchemy Core reflections that live here so both services agree on table shapes without
a second ORM owning DDL.

- **R0 (now):** package placeholder.
- **R1:** `tables.py` — reflected `Table` objects for the 18 ported tables; shared engine/config
  helpers consumed by `services/fastapi-rt`.

Never put DDL or migrations here — that belongs to `services/django-api` (the `migrations` skill).
