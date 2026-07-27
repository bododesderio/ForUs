# Project Context
Last updated: 2026-07-27

## Current task
**Backend re-platform planned (Phase R) — awaiting approval.** Express/Node →
Django (DRF, core/CRUD/admin/payments) + FastAPI (realtime chat, video tokens,
webhooks, AI/moderation), Postgres kept, big-bang pre-launch rewrite. Runs
**before** the Stillwater feature migration. See `.claude/adrs/ADR-001-backend-replatform.md`
+ `docs/plans/backend-replatform-plan.md`. Then Stillwater 0–10 (design built
from doc spec + existing palette). Plans: `docs/plans/`. No code yet.

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

## Next steps (resume here tomorrow)
1. **Approve/kick off Phase R** — start at **R0** (scaffold `services/django-api/` +
   `services/fastapi-rt/` + nginx gateway + compose + CI pytest/ruff). See
   `docs/plans/backend-replatform-plan.md`.
2. Start **Pesapal merchant onboarding** application (long pole, ~1–2 wk approval).
3. After Phase R lands → Stillwater 0–10 on the Python backend.
- Open item (non-blocking): dockerized Node `backend` service still reads
  `DATABASE_URL=localhost:...` — wrong inside container; irrelevant (deleted at R7).

## Artifacts produced today
- `.claude/adrs/ADR-001-backend-replatform.md`
- `docs/plans/backend-replatform-plan.md` (Phase R, R0–R7)
- `docs/plans/stillwater-implementation-plan.md` (0–10, re-sequenced after R)
- Applied: Firebase+MinIO removed, StorageService→R2, ports→lane 10000. **Nothing committed.**

## Active branches
- main: stable (all changes uncommitted in working tree)
