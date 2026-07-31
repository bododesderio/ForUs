# Project Context
Last updated: 2026-07-31

## Current task
**Phase R0 COMPLETE & verified — next up R1 (schema → Django models).** Express/Node →
Django (DRF, core/CRUD/admin/payments) + FastAPI (realtime chat, video tokens,
webhooks, AI/moderation), Postgres kept, big-bang pre-launch rewrite. Runs
**before** the Stillwater feature migration. See `.claude/adrs/ADR-001-backend-replatform.md`
+ `docs/plans/backend-replatform-plan.md`.
R0 scaffold (`services/django-api`, `services/fastapi-rt`, `libs/db`, `infra/`, CI) boots
healthy behind the nginx gateway on lane 10000; audit captured in
`docs/phase-R-hardening-requirements.md`. Node backend untouched. **Resume at R1 tomorrow.**

## What it is
**ForUs** — a mobile-first mental wellness platform: therapist consultations,
daily mood check-ins, peer community/chat, and a curated resource library.
Single Expo codebase serves three roles (user, consultant/therapist, admin).

## Stack
**Mobile** — Expo 53 · React Native 0.79 · Expo Router · Tamagui · Agora RTC
(video, post Phase 6). Frontend stays RN/Expo — unchanged by the re-platform.
**Desktop admin** (post Phase 9) — Next.js 14 · TypeScript · Tailwind; shares
tokens with mobile via `packages/tokens/`
**Backend — TARGET (Phase R):** Django + DRF (data/admin/auth/CRUD/payments/
migrations) + FastAPI (realtime chat, video tokens, webhooks, AI/moderation) ·
PostgreSQL · Redis (pub/sub, cache, Celery broker) · Celery. *Current Express/
Node backend is transitional, deleted at Phase R7.*
**Infra** — Docker Compose (PostgreSQL + Redis) · **Cloudflare R2** (media, S3-
compatible) · Expo push (notifications) · nginx gateway
**Ports** — ForUs lane **10000**: gateway 10000, Django 10001, FastAPI 10002,
Celery 10003, admin-web 10004, Node(transitional) 10005, Postgres 10010, Redis 10011
**CI** — GitHub Actions · will add Python (ruff + pytest) in Phase R0
**Dev** — `node dev.js` boots backend on `:10005` + Expo (Metro 8081), watches both

## Locked decisions (2026-04-27)
- **Brand** — `ForUs` (Stillwater is the design-source codename only)
- **Payments** — Pesapal API v3 mobile money (MTN/Airtel/M-Pesa), fully custom
  UI (no iframes/redirects); only carrier UI shown is the OS-level STK PIN prompt
- **Video** — Agora RTC (lowest latency in African markets)
- **Email** — Resend
- **Surfaces** — Expo (phone + tablet) + separate Next.js desktop admin at
  `admin.forus.app`
- **Two-track therapists** — ForUs+ subscription (in-network) + marketplace
  therapists with per-session rates (25% platform fee, monthly disbursement)

## Known issues / not-yet-built (Stillwater roadmap)
- Payments/subscriptions — zero implementation (Phase 5)
- Email — `email_verified` column never set, no provider wired (Phases 1–2)
- Forgot password — table exists, route is a stub (Phase 2)
- Video calling — chat is text-only (Phase 6)
- Peer feed — `community_*` tables exist, no API/UI; frontend uses mock (Phase 4)
- Crisis SOS / safety plans / moderation — none (Phases 7, 9)
- Goals, streaks, voice journal, session notes, earnings, audit log, billing
  dashboard, cohort analytics — none (Phases 3, 8, 9, 10)

## Recent decisions (2026-07-31)
- **Phase R0 executed & verified** (see below). Direction chosen: capture audit as Phase-R
  hardening requirements + scaffold R0; do **not** refactor the throwaway Node backend.
- **Django admin relocated to `/api/admin/`** (traefik-routing convention) — old `/admin/` 404s.
- **Audit** of as-built Node+Expo done: 25 findings (2 Critical IDOR, a boot-crash, perf/arch debt)
  → `docs/phase-R-hardening-requirements.md`, each mapped to an R-phase + verification test.

## Recent decisions (2026-07-27)
- **Backend re-platform** approved in principle: Express/Node → Django+FastAPI,
  big-bang pre-launch rewrite, runs BEFORE Stillwater (ADR-001). *Awaiting go for execution.*
- **Storage** → Cloudflare R2 (S3-compatible, zero egress). MinIO removed; Cloudinary
  retired at R5. Firebase deleted (was dead config).
- **Redis** confirmed load-bearing (unused today; wired in Phase R).
- **Ports** normalized to lane 10000 (registry updated); `:4000` drift was stale.
- **Design** for Stillwater: build from doc spec + existing 8-theme palette (no design files exist).

## Conventions
- **Target:** Django ORM + migrations (via `migrations` skill, reversible); FastAPI reads
  same DB via asyncpg + SQLAlchemy Core (Django owns schema). UUID PKs on new models.
- **Current (Node, transitional):** raw SQL `$1,$2`; services throw, controllers catch.
- Ports: never hardcode — derive from lane 10000 (`ports` skill + `~/.claude/PORTS.md`).

## Next steps (resume here tomorrow — START R1)
1. **R1 — schema → Django models + migrations.** Port the 18 tables (`backend/db/schema.js`)
   to Django models with **UUID PKs**, FK cascades, soft-delete managers, enums → `TextChoices`.
   Reversible initial migration (via `migrations` skill). Wire Django Admin for every model.
   Reflect the same tables into SQLAlchemy Core in `libs/db/tables.py`. Resolves ARCH-1, ARCH-4, BUG-6.
   Acceptance: `migrate` up+down on scratch DB; Admin lists all models; FastAPI reads a row via Core.
2. Start **Pesapal merchant onboarding** (long pole, ~1–2 wk approval) — in parallel with R1.
3. After Phase R lands → Stillwater 0–10 on the Python backend.

## R0 done (2026-07-31) — scaffold verified booting healthy on lane 10000
- `services/django-api/` (Django 5 + DRF, SimpleJWT rotation+blacklist, fail-fast env, structlog,
  uniform exception handler, R2 storage cfg, Celery, `/api/health`, pytest+ruff)
- `services/fastapi-rt/` (FastAPI, asyncpg + SA Core read-only, pydantic-settings, `/rt/health`, pytest+ruff)
- `libs/db/` (reflection placeholder), `infra/` (compose pg16+redis7+django+fastapi+celery+nginx gateway, `.env.example`)
- `.github/workflows/python-ci.yml` (ruff+pytest, pg+redis services)
- `docs/phase-R-hardening-requirements.md` (25 findings → phase-mapped acceptance criteria)
- **Verified:** `docker compose up` → both health endpoints 200 via gateway; 18 migrations apply; celery connects; admin at `/api/admin/`. Node backend untouched (rollback = `rm -rf services/ libs/ infra/`).

## Active branches
- `feat/backend-r0-scaffold`: Phase R0 (pushed; PR open). `main`: stable.
