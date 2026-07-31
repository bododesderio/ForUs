# Project Memory
Created: 2026-07-27

## [2026-07-31] — Audited as-built Node+Expo; executed & verified Phase R0
- **Decisions:**
  - Chose to **capture the audit as Phase-R hardening requirements + scaffold R0** rather than
    refactor the Node backend (it is deleted at R7 — polishing throwaway code is waste).
  - **R0 scaffold landed** (`services/django-api`, `services/fastapi-rt`, `libs/db`, `infra/`, CI),
    boots healthy behind nginx gateway on lane 10000. Django admin relocated to **`/api/admin/`**.
  - `docs/phase-R-hardening-requirements.md` = 25 findings → phase-mapped acceptance criteria.
- **Audit findings (as-built, first-hand + 2 recon agents):**
  - 🔴 **Node backend does NOT boot as written**: `chatRoutes.js:4` imports `generateChatToken`,
    which `ChatController.js` never exports → ESM SyntaxError at startup. (BUG-1)
  - 🔴 IDOR ×2: `POST /api/auth/push-token` & `/send-notification` unauth + `authId` from body (SEC-1);
    chat room access broken — HTTP `joinRoom` self-joins any room + WS `join_room` no membership check (SEC-2).
  - 🟠 refresh no rotation + inconsistent expiry (SEC-3); WS token in query string (SEC-4);
    `getAppointments` runs `cancelExpiredAppointments()` on every read incl. sync push in a GET (PERF-1);
    in-memory WS Map + `ioredis` never instantiated → single-instance only (PERF-3).
  - Frontend: tokens in **plaintext AsyncStorage** not SecureStore (SEC-9); **chat broken** (Stream SDK
    consumed but never instantiated; custom WS ctx interface-mismatched); duplicate auth contexts;
    mock community feed; no error boundaries; near-zero a11y (ARCH-5).
- **Patterns / gotchas:**
  - Django reads existing `bcryptjs` hashes via `BCryptSHA256PasswordHasher` first in PASSWORD_HASHERS (R2 dep).
  - FastAPI `DATABASE_URL` normalized to `postgresql+asyncpg://` in `config.sqlalchemy_url`.
  - `infra/.env` is gitignored; `.env.example` tracked. `env_file: .env` in compose needs it to exist.
  - Container-internal ports stay 8000; host maps via lane (gateway 10000, django 10001, fastapi 10002).
- **Verified:** `docker compose up --build` → `/api/health` & `/rt/health` both 200 via gateway;
  18 migrations apply; celery connects to redis; `/api/admin/` 302, `/admin/` 404. Torn down clean.
- **Resume:** **START R1** — port 18-table schema to Django models (UUID PKs) + reversible migration +
  Admin + `libs/db` Core reflections. Pesapal onboarding in parallel. See CONTEXT.md "Next steps".

## [2026-07-27] — Planned backend re-platform + service audit; normalized ports
- **Decisions:**
  - Re-platform backend Express/Node → **Django (DRF) + FastAPI**, keep Postgres.
    Django = data/admin/auth/CRUD/payments/migrations; FastAPI = realtime chat, video
    tokens, webhooks, AI/moderation. **Big-bang pre-launch rewrite**, runs BEFORE
    Stillwater feature migration. Recorded in ADR-001.
  - Storage → **Cloudflare R2** (S3-compatible, zero egress). Removed **MinIO** (infra+code+dep)
    and **Firebase** (was dead config). Cloudinary retired at Phase R5. Redis kept (wired in Phase R).
  - Frontend stays **React Native/Expo** — unchanged.
  - Stillwater design source files (screens.jsx, user-app.jsx, …) **do not exist** in repo/git
    history → build from the migration-doc spec + existing 8-theme palette (`constants/theme.tsx`).
  - Ports normalized to **lane 10000** (registry `~/.claude/PORTS.md` updated). `:4000` was stale;
    dev.js is PORT-driven → canonical 10005. Node=10005 (transitional), Django=10001, FastAPI=10002.
- **Patterns:**
  - Node backend uses raw SQL `$1,$2`; Drizzle defined but **never used at runtime**. Chat has TWO
    impls (Stream Chat SDK + custom `ws.js`) → consolidate to FastAPI WS in Phase R4.
  - Schema truth = Django migrations; FastAPI reads same DB via asyncpg+SQLAlchemy Core (no 2nd ORM).
  - New models move to **UUID PKs** (current tables are `serial`; pre-launch = free to change).
- **Gotchas:**
  - Migration doc names Stripe + Stream Video, but locked decisions are **Pesapal + Agora** — ignore the doc there.
  - `package.json` migrate = `drizzle-kit push` but migrations/ has hand-written SQL + one empty file; no test harness (`echo "no test"`). Both fixed by Phase R (Django migrations + pytest).
  - Dockerized Node `backend` service reads `DATABASE_URL=localhost` — wrong in-container; moot (deleted at R7).
- **Artifacts:** ADR-001, `docs/plans/backend-replatform-plan.md`, `docs/plans/stillwater-implementation-plan.md`. Nothing committed.
- **Resume:** Phase R0 scaffolding + start Pesapal merchant onboarding. See CONTEXT.md "Next steps".

