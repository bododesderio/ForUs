# Project Memory
Created: 2026-07-27

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

