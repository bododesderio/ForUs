<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# ADR-001 — Re-platform backend to Django + FastAPI; consolidate third-party services

- **Status:** Proposed (awaiting approval — no code written)
- **Date:** 2026-07-27
- **Deciders:** Bodo Desderio
- **Supersedes:** the Express/Node backend assumption in `docs/plans/stillwater-implementation-plan.md`

## Context
ForUs is **pre-launch** (no live users/data; payments, video, and the Stillwater
feature set are unbuilt). The current backend is **Express 5 / Node**, raw SQL over
`pg` (`$1,$2`), with Drizzle defined-but-unused. A services audit found overlap and dead
config: Firebase configured but never referenced; two overlapping media-storage providers both handling
media; Stream Chat **and** a custom `ws.js` both handling chat realtime; `ioredis` a
dependency with no instantiation. Global engineering standard is Python (Django for
data/admin, FastAPI for AI/high-throughput). Building the 20-week Stillwater feature set on
Express and later rewriting to Python would mean building everything twice.

## Decision
Re-platform the backend **before** the Stillwater feature migration:

1. **Django (+ DRF)** owns: data models, migrations, Django Admin, auth (DRF SimpleJWT),
   users/profiles/appointments/resources/events/mood/community CRUD, payments/billing.
2. **FastAPI** owns hot paths: realtime chat (WebSockets), Agora video-token issuing,
   Pesapal IPN webhook, moderation/AI scanning, high-throughput read endpoints.
3. **PostgreSQL** stays. **Django migrations are the single source of schema truth.**
   FastAPI reads the same DB via **asyncpg + SQLAlchemy Core** (no second ORM owning schema —
   avoids drift).
4. **Big-bang rewrite** (pre-launch): build fresh Python backend, port the 18-table schema to
   Django models, single cutover, then delete the Node backend.
5. **Frontend unchanged** — React Native/Expo keeps talking to the same REST surface + WebSockets.

## Service replacements (audit → target)
| Current | Decision | Target |
|---|---|---|
| Firebase (dead) | **Delete** | — (no replacement; push stays Expo) |
| Expo Push (`exp.host`) | **Keep** | Called via `httpx` from Django/Celery |
| Overlapping media storage | **Consolidate → Cloudflare R2** *(user decision 2026-07-27; S3-compatible, zero egress fees, cheap object storage — boto3/django-storages path)* | `django-storages` + `boto3` → R2 endpoint (`region='auto'`); legacy media providers removed (infra, code, deps); server-side upload consolidated at R5. Transforms via Cloudflare Images if ever needed, else client-side `expo-image-manipulator` |
| Stream Chat + custom `ws.js` (overlap) | **Consolidate → self-hosted realtime on FastAPI** (no per-MAU SaaS cost; data stays in-house; FastAPI is the realtime tier) | FastAPI WebSockets + Redis pub/sub + Postgres `chat_*` tables; drop Stream Chat *(strong recommendation)* |
| Redis (unused) | **Keep + actually use** | Redis = WS pub/sub across workers, cache, Celery broker, rate-limit store |
| node-cron jobs | **Replace** | Celery + Celery-beat (reminders, streak, auto-cancel, payouts) |
| JWT (`jsonwebtoken`) | **Replace** | DRF SimpleJWT (access 15m / refresh 7d; blacklist app replaces `refresh_tokens`) |
| express-validator / zod | **Replace** | DRF serializers (Django) + Pydantic (FastAPI) |
| helmet / cors / rate-limit | **Replace** | Django security middleware + `django-cors-headers` + DRF throttling / `slowapi` |
| multer | **Replace** | DRF file fields / FastAPI `UploadFile` → Cloudflare R2 |
| pino | **Replace** | `structlog` (Phase 9's structured-logging goal comes free) |
| Pesapal (planned) | axios → **`httpx`** | server-side calls from Django billing app + FastAPI IPN |
| Agora (planned) | **`agora-token-builder`** (Python) | token issuer in FastAPI |
| Resend (planned) | **`resend`** (Python SDK) | Django EmailService |

## Cross-cutting decisions
- **PK convention:** move new schema to **UUID PKs** (aligns with global default; non-enumerable
  IDs suit a health app). Pre-launch = no data to migrate, so this is free now. *(Diverges from the
  current `serial` PKs — deliberate.)*
- **Ports:** every service (Django, FastAPI, Redis, Postgres, admin-web) gets a port via the
  **`ports` skill + `~/.claude/PORTS.md` lane** — no hardcoding. Resolves the current 3000-vs-4000 drift.
- **Gateway:** nginx path-routes `/api/**` → Django, `/rt/**` + `/ws/**` → FastAPI.
- **Migrations:** Django migrations governed by the `migrations` skill (zero-downtime, reversible).
- **Repo shape:** anticipate the Phase 9 monorepo — backend becomes `services/django-api/` +
  `services/fastapi-rt/` with a shared `libs/` for DB models/config.

## Consequences
**Positive:** one language for backend; Django Admin massively de-risks Phase 9 admin work; kills
recurring Stream Chat cost; removes dead Firebase; realtime + AI land on the async-native tier;
Stillwater features are built once, on the target stack.
**Negative / risks:** two-service ops complexity (mitigate: shared Docker Compose, one gateway,
Celery already needed); dual DB access (mitigate: Django owns schema, FastAPI read-mostly via Core);
throwaway of working Node code (acceptable pre-launch); Python team ramp.

## Alternatives considered
- **Django-only (DRF):** simpler ops but no async-native realtime tier; rejected — realtime chat +
  AI moderation are core and FastAPI is the standard for them.
- **FastAPI-only:** loses Django Admin, which is the biggest lever for Phase 9. Rejected.
- **Strangler-fig migration:** unnecessary pre-launch (no data/uptime to protect); ~1.5–2× effort. Rejected.
- **Keep Express, build Stillwater, migrate later:** builds everything twice. Rejected.
