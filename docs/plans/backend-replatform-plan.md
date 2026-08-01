<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# ForUs — Backend Re-platform Plan (Phase R)

**Decision record:** `.claude/adrs/ADR-001-backend-replatform.md`
**Planned:** 2026-07-27 · **Status:** DRAFT for approval — no code, nothing committed.
**Runs BEFORE** Stillwater 0–10 (`docs/plans/stillwater-implementation-plan.md`).
**Strategy:** pre-launch big-bang. Build Python backend beside the Node one, cut over once, delete Node.

## Target architecture
```
                         ┌────────── nginx gateway (ports via `ports` skill) ──────────┐
  Expo RN app  ── REST ─►│  /api/**  → Django + DRF        /rt/**,/ws/** → FastAPI      │
                └ WS ────►│                                                              │
                         └───────────────┬───────────────────────┬────────────────────┘
                                          │                       │
                          ┌───────────────▼─────┐    ┌────────────▼───────────┐
                          │ Django (DRF)         │    │ FastAPI (async)        │
                          │ models·admin·auth·   │    │ ws chat·video tokens·  │
                          │ CRUD·billing·        │    │ Pesapal IPN·moderation │
                          │ migrations (schema   │    │ (asyncpg + SA Core,    │
                          │ source of truth)     │    │  read-mostly)          │
                          └──────┬───────────────┘    └──────┬─────────────────┘
                                 │        shared              │
                 ┌───────────────┴──────────┬─────────────────┴─────────┐
              PostgreSQL              Redis (pub/sub·cache·         Cloudflare R2
              (Django ORM)            Celery broker·rate limit)     (S3-compat, zero egress)
                                 Celery workers + beat (reminders·streak·auto-cancel·payouts)
```
Repo shape (aligns with Stillwater Phase 9 monorepo):
```
services/django-api/   services/fastapi-rt/   libs/db/ (SQLAlchemy Core reflections + shared config)
infra/ (docker-compose, nginx)     frontend/ (unchanged Expo app)
```

## Cross-cutting (whole of Phase R)
- **Ports first:** run the `ports` skill to assign a lane for Django, FastAPI, Redis, Postgres,
  nginx (R2 is external — no local port). Fix `.env.example` (kills 3000-vs-4000 drift). No hardcoded ports.
- **Schema truth = Django migrations** (governed by the `migrations` skill). FastAPI never runs DDL.
- **UUID PKs** for all models (ADR-001). Keep FK cascades + soft-delete (`deleted_at`) semantics.
- **API compatibility:** preserve current REST paths/shapes the Expo app already calls (see backend
  route inventory) so the frontend needs minimal change. Any shape change is documented + shipped with
  a matching frontend edit.
- **Parity harness:** a contract-test suite hits old Node and new Python with identical requests and
  diffs responses. This is the cutover gate.

---

## R0 · Scaffolding & infra  — Est 4–6 p-days · blocked-by: none
- Django project `services/django-api/` (Django 5, DRF, `django-cors-headers`, SimpleJWT,
  `django-storages`, `structlog`, `celery`, `redis`, `psycopg`).
- FastAPI project `services/fastapi-rt/` (FastAPI, `uvicorn`, `asyncpg`, SQLAlchemy Core, `redis`,
  `pydantic-settings`).
- `libs/db/` shared config + SQLAlchemy Core table reflections.
- `infra/docker-compose.yml` (postgres 16, redis 7, django, fastapi, celery, nginx) + nginx
  path routing. `.env.example` rewritten (Firebase + MinIO removed; Redis/R2/Pesapal/Agora/Resend keys).
- CI: add Python lint (ruff) + test (pytest) jobs.
- **Accept:** `docker compose up` boots all services healthy; gateway routes `/api/health` (Django)
  and `/rt/health` (FastAPI). **Rollback:** delete `services/` — Node untouched.

## R1 · Schema → Django models + migrations  — ✅ DONE 2026-08-01 · blocked-by: R0
- Port the 18 tables (`backend/db/schema.js`) to Django models with **UUID PKs**, FK cascades,
  soft-delete managers, enums → `TextChoices`. Keep `refresh_tokens` semantics via SimpleJWT
  blacklist; keep `password_reset_tokens`, `community_*` (wired later by Stillwater).
- Generate initial migration (reversible). Wire Django Admin for every model (down-payment on Phase 9).
- FastAPI: reflect the same tables into SQLAlchemy Core in `libs/db/`.
- **Accept:** `migrate` applies + reverses on scratch DB; Django Admin lists all models; FastAPI can
  read a row via Core. **Rollback:** drop the Python DB; Node keeps its own schema.

## R2 · Auth (DRF SimpleJWT)  — ✅ DONE 2026-08-01 · blocked-by: R1
- Port: register-user, register-consultant, login, refresh, logout, change-password, push-token save.
- Access 15m / refresh 7d; blacklist on logout. bcrypt hashes are compatible — **verify Django can read
  existing `bcryptjs` hashes** (both bcrypt; set Django `BCryptPasswordHasher`). Activity logging →
  Django signal.
- **Accept:** parity harness green for all `/api/auth/*`; a token from Python auths a protected route.
  **Rollback:** gateway routes `/api/auth` back to Node.

## R3 · Core CRUD domains (DRF)  — ✅ DONE 2026-08-01 · blocked-by: R2
> All 6 domains: `mood`, `activities`, `events` (BUG-4), `resources`, `appointments` (conflict
> detection, state machine, auto-cancel, reviews), `users` (17 eps). 59 tests. Proactive security:
> appointment IDOR closed, `/users` PII gated admin-only, `send-notification` admin-only.
Port these route groups to DRF viewsets/serializers, preserving paths/shapes:
`/api/users` · `/api/appointments` (incl. conflict detection, auto-cancel, confirm/reject/reschedule/
cancel, reviews, start-session) · `/api/events` · `/api/mood` · `/api/resources` · `/api/activities`.
Admin/consultant route stubs stay stubs (Stillwater Phase 9 fills them).
- **Accept:** parity harness green per group; appointment conflict + auto-cancel behavior matches Node.
  **Rollback:** per-group gateway route back to Node (this is why we port group-by-group).

## R4 · Realtime chat on FastAPI  — 🚧 IN PROGRESS (R4a+R4b done 2026-08-01) · blocked-by: R1 (R3 recommended)
> R4a: Django chat REST (SEC-2). R4b: FastAPI WS /ws (SEC-4/BUG-7/PERF-3..6/SEC-2). R4c-1: ChatContext.js → ticket flow + message-shape normalize + fetchRooms/loadHistory. Remaining R4c-2 (needs Expo runtime): rewrite chat SCREENS off Stream components, remove stream-chat-* deps.
- Port `/api/chat` room/message REST to Django; move the realtime layer (currently `ws.js` + Stream
  Chat) to **FastAPI WebSockets** at `/ws/**`, fanning out via **Redis pub/sub** (multi-worker).
  Persist to `chat_messages`/`message_reactions`. **Drop Stream Chat** (`getstream`, `stream-chat`).
- Frontend: repoint `ChatContext.js` WebSocket URL to the FastAPI gateway path; remove
  `stream-chat-expo`/`stream-chat-react-native*`. *(Only frontend change in Phase R.)*
- **Accept:** two clients exchange messages + typing + reactions in real time across two FastAPI
  workers; history loads from Postgres. **Rollback:** point WS back to `ws.js`; keep Stream deps until R7.

## R5 · Media consolidation → Cloudflare R2  — ✅ DONE (backend) 2026-08-01 · blocked-by: R1
> Django POST /api/upload → R2 (django-storages). SEC-6: size cap before stream, magic-byte content sniff (client mimetype untrusted), random key, {success,url} parity. Cloudinary gone server-side; frontend cloudinaryUpload.ts retire = R4c-2/R7. 6 tests.
- `django-storages` + `boto3` → R2 (S3-compatible endpoint, `region='auto'`). Port `/api/upload`
  (multer) **and** the residual client-direct `/cloudinary-signature` route to a single Django upload
  path — either server-side put returning a public/custom-domain R2 URL, or a **presigned R2 PUT**.
  **Remove Cloudinary entirely** (route + `cloudinary` dep).
- Frontend: `cloudinaryUpload.ts`/`uploadService.ts` repoint to the R2 upload/presigned flow.
- Transforms: R2 has none native — add **Cloudflare Images** only if server-side resizing is required;
  otherwise resize client-side with `expo-image-manipulator` (already a dep).
- **Accept:** image + audio upload round-trips through R2, served via public/custom-domain URL.
  **Rollback:** keep the old route live in parallel until confirmed.

## R6 · Background jobs → Celery  — Est 3–4 p-days · blocked-by: R3
- Port `node-cron` jobs to Celery-beat: appointment reminder (every 5 min), auto-cancel expired,
  streak compute (Stillwater P3 will extend), payout cycle (Stillwater P5). Push via `httpx` → Expo.
- **Accept:** reminder fires 15 min pre-appointment through Celery; auto-cancel matches Node timing.
  **Rollback:** re-enable node-cron; Celery tasks are additive.

## R7 · Cutover & decommission Node  — Est 3–5 p-days · blocked-by: R2–R6
- Gateway routes **100%** of `/api` + `/ws` to Python. Run parity harness full-suite; soak 48h in staging.
- Remove `backend/` (Node) and Stream Chat deps. (Firebase + MinIO already removed 2026-07-27;
  Cloudinary removed at R5.) Update README, CONTEXT,
  docker-compose, CI to Python-only. Tag `v-backend-python`.
- **Accept:** Expo app works end-to-end against Python only; Node deleted; CI green.
  **Rollback (last resort):** revert the cutover commit — Node returns until the tag is deleted.

---

## Effort roll-up: **~40–56 p-days (~8–11 weeks solo)** before Stillwater 0–10 begins.

## Impact on the Stillwater plan
`docs/plans/stillwater-implementation-plan.md` is **re-sequenced to run after Phase R** and its backend
tasks change target:
- All "Express route / Node service" work → **DRF viewsets (Django)** or **FastAPI routers** per the
  ADR split (payments/CRUD → Django; IPN webhook, Agora token, moderation scan, realtime → FastAPI).
- Phase 1 (schema) is **absorbed into R1** — new Stillwater columns/tables are added as Django models +
  migrations, not a Drizzle migration. B‑3 (drizzle-push mismatch) and B‑4 (no test harness) are resolved
  by R0/R1 (pytest) and no longer Stillwater blockers.
- Phase 6 Agora token issuer → FastAPI (already the plan's realtime tier). Phase 5 Pesapal IPN → FastAPI;
  billing CRUD → Django. Phase 9 admin gets a **massive head start from Django Admin** built in R1.
- Frontend phases (0, 2, 3, 4 screens, tablet, voice) are **unaffected** — RN/Expo stays; the design
  decision stands (build from doc spec + existing 8-theme palette, B‑1 resolved).

## Open items to confirm at phase entry (not blocking approval)
- R5: image transforms — add Cloudflare Images, or resize client-side? (recommend client-side unless the product needs server-side transforms).
- R2 (auth sub-phase): confirm Django reads existing bcrypt hashes cleanly (pre-launch = likely no real users anyway).
- Ports: run the `ports` skill to mint the ForUs lane before R0.
