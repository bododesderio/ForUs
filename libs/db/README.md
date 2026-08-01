<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# libs/db — shared data access

Django owns the PostgreSQL schema (migrations = source of truth). FastAPI reads it via
SQLAlchemy Core reflections that live here so both services agree on table shapes without
a second ORM owning DDL.

- **R0:** package placeholder.
- **R1 (done):** `tables.py` — async `reflect(engine)` populates a shared `MetaData` with the 19
  Django-owned tables; `table(name)` returns a Core `Table` ready for `select()`. Consumed by
  `services/fastapi-rt` (reflected once at startup in the app lifespan). `refresh_tokens` is
  intentionally excluded — its semantics moved to SimpleJWT's `token_blacklist` app.

Never put DDL or migrations here — that belongs to `services/django-api` (the `migrations` skill).
