<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# Project Context
Last updated: 2026-08-01

## Current task
**PHASE R COMPLETE. Started Stillwater on the Python backend — P4 (community feed) backend done.**
Stillwater plan is Node/Drizzle-oriented and needs reconciliation: **P1 schema was absorbed by R1**,
**P0 test-harness by Phase R** (98 tests). P4 community feed API built on the existing R1
`community_*` models: `/api/community/posts` (feed + create), post detail/delete, like/unlike,
comments (list/create/delete) — pseudonymous via `username`, soft-delete, owner/admin gating. 8 tests.
**Follow-ups noted:** groups + typed reactions (support/same/hugs) need new schema; feed UI (B-1 design
blocker); pseudonymous-handle generation on signup. Next verifiable backend slices: deferred push
wiring, forgot-password/email (P2 backend, needs Resend stub). External-dep phases (payments/video)
gated on Pesapal/Agora.
R4c-2 (last piece) rewrote all chat UI off Stream onto the native `ChatContext`: shared
`ChatRoomList`, native `ChatRoomScreen` (join + history, send, typing, read receipts), 3 chat tabs
→ thin wrappers, deleted 2 orphaned Stream components, removed `stream-chat*` (51 pkgs pruned).
Verified `tsc` clean on all chat files (no stream-chat imports; project total = pre-existing baseline).
**Backend: 90 tests green, stack verified live. Frontend chat: type-clean but not yet runtime-tested
(needs a simulator) — v1 defers reactions/threads; see `docs/R4c-2-chat-ui-handoff.md`.**
R5: single Django upload path `POST /api/upload` → Cloudflare R2 via django-storages. **SEC-6**:
oversize rejected before streaming (Django spools to temp, no 50 MB in-memory buffer), real
content-type **sniffed from magic bytes** (client mimetype never trusted — a `.exe` renamed `.png`
is rejected), random key, returns `{success, url}` (Node parity). 84 tests green (73 Django + 11 FastAPI).
Cloudinary is gone server-side; only the frontend `cloudinaryUpload.ts` + client uploads remain to
retire (frontend, with R4c-2). `uploadService.ts` already targets `/api/upload` — no change needed.

## Superseded — Phase R4 (R4a+R4b done, R4c-1 done; R4c-2 chat UI screens remains)
R4a: chat REST on Django. R4b: FastAPI WS `/ws` (ticket auth SEC-4, persist-then-broadcast BUG-7,
Redis pub/sub fan-out PERF-3..6, membership SEC-2). **R4c-1:** `ChatContext.js` now uses the ticket
flow (`GET /api/chat/token` → `wss://…/ws?ticket=`), normalizes message casing, and exposes
`fetchRooms`/`loadHistory` REST helpers. Stream fully dropped server-side; client no longer puts a
token in the WS URL. **R4c-2 (remaining, needs Expo runtime):** the chat *screens*
(`ChatRoomScreen.tsx`, `ChatComponent.tsx`, `CustomMessage.tsx`, `(users|consultants|tabs)/chat.tsx`,
`_layout.tsx`) still render via Stream Chat components — rewrite them onto the native context, then
remove `stream-chat`/`stream-chat-expo`/`stream-chat-react-native*` from `package.json`.
78 backend tests green. **⚠ Cannot run Expo/RN in this env — R4c-2 UI needs a runtime to verify.**

## Superseded — Phase R3 COMPLETE (next up R4 realtime chat)
Express/Node → Django (DRF, core/CRUD/admin/payments) + FastAPI (realtime chat,
video tokens, webhooks, AI/moderation), Postgres kept, big-bang pre-launch rewrite.
Runs **before** the Stillwater feature migration. See ADR-001 + `docs/plans/backend-replatform-plan.md`.
R3 ported all 6 CRUD domains (~42 endpoints) via DRF APIViews with path/shape parity:
- **R3a:** `mood` (2) + `activities` (1).
- **R3b:** `events` (5, BUG-4 fixed) + `resources` (2).
- **R3c:** `appointments` (15: conflict detection, state machine, reviews, auto-cancel, availability).
- **R3d:** `users` (17: profile, details, consultant/user lists, deletes, push-token, notifications).
59 django tests green. Shared `core/permissions.py` (`IsAdminRole`). Resolves BUG-4, BUG-6,
ARCH-2/ARCH-3, PERF-1(reads) + three proactive security fixes (appointment IDOR, `/users` PII
gate, admin-only `send-notification`). Push delivery + auto-cancel scheduling → R6 (Celery).

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

## Recent decisions (2026-08-01, R3d)
- **Users domain ported** (17 eps) in `accounts/user_{views,services,urls}.py`, mounted `/api/users/`.
  Payload builders match Node's SELECT column shapes exactly (profile, user/consultant detail, lists).
- **[SECURITY] `GET /users` is admin-only** — Node let any authed caller list every user's email/PII.
- **[SECURITY] `send-notification` (+consultant) admin-only** — Node let anyone push to any id (SEC-1 class).
  Push delivery deferred to R6; the endpoints persist a `notifications` row.
- Push-token + notification read/preference derive the owner from `request.user`; mark-read is
  ownership-scoped (`filter(recipient=request.user)`), so one user can't touch another's notifications.
- The frontend's real `/users/push-token` + `/users/consultant/push-token` now exist here (the R2
  auth push-token remains for SEC-1 coverage).

## Recent decisions (2026-08-01, R3c)
- **Appointments ported** (15 eps) via APIViews + `appointments/services.py` (auto-cancel, conflict
  detection, perspective join builder, filtered pagination).
- **Conflict detection**: point-in-interval over active statuses (existing.start ≤ new_start ≤
  existing.end), faithful to Node's start-instant check. Reused on create + reschedule (excludes self).
- **Auto-cancel**: pending/confirmed with start >15 min past → cancelled `Missed/Expired`, run on every
  list fetch (bulk `.update()` with explicit `updated_at`). Celery schedule is R6; logic lives here.
- **[SECURITY] IDOR closed**: `/appointments/user/<id>` and `/consultant/<id>` now require the caller
  to be the owner or an admin. Node exposed any user's therapist appointments to any authed caller;
  the frontend only fetches its own, so legitimate flows are unaffected. Availability stays open (booking).
- **State machine**: confirm/reject only from `pending`; users may only cancel or start-session via
  `/status`; consultants own their appts. Review requires a `completed` appt + is unique per (user,consultant);
  writes refresh `consultant_details.rating`.
- **Push notifications deferred to R6** — transitions complete without them.

## Recent decisions (2026-08-01, R3a+R3b)
- **DRF APIViews (not ModelViewSets)** — the Node paths are non-RESTful (`/events/get`,
  `/events/details/:id`, `/resources/upload`); APIViews preserve exact paths/shapes/status codes.
- **Success shapes copy Node exactly** (parity gate); only ERROR contract is normalized (ARCH-2).
  Endpoints hand-return Node's precise error bodies (e.g. mood `{message:'Date is required'}`)
  rather than raising, so the harness diffs clean.
- **BUG-4 fixed:** `core/permissions.IsAdminRole` → non-admin event create/update/delete get **403**
  (Node returned a plain object and hung). `update` is a true PATCH (only supplied fields; Node nulled omitted ones).
- **Events pagination:** kept Node's offset envelope `{page,limit,total,pages}` for parity (not cursor).
- **Resources list stays public** (Node had no auth); soft-deleted rows hidden by the default manager.
- File **upload** for resources takes a `file_url` in the body (client already uploaded) — real
  multipart→R2 is R5; R3 ports the record CRUD only.

## Recent decisions (2026-08-01, R2)
- **Phase R2 executed & verified.** `/api/auth/*` on DRF SimpleJWT. Envelope parity with Node:
  `{success, message, user, accessToken, refreshToken}` (camelCase token keys); login 200,
  register-user **201**, register-consultant **200** (Node quirks preserved); login failures 400.
- **SEC-3 rotation:** refresh returns a NEW refresh token + blacklists the old (reuse → 403).
  Required one **additive** frontend edit (`api.js` refresh interceptor persists the rotated token;
  safe for Node too, which never sends one). `token_blacklist` app carries it.
- **SEC-1:** `push-token` is auth-gated, owner = `request.user` (never body). `send-notification`
  NOT exposed (was unauthenticated) — becomes an internal Celery task in R6.
- **Hasher fixed:** `BCryptPasswordHasher` (not BCryptSHA256) so bcryptjs `$2b$` hashes verify;
  a future Node→Python user copy prefixes bare hashes with `bcrypt$`.
- **ARCH-2:** exception handler normalizes every DRF error into `{success, message, errors}`
  (frontend reads `.message`). Register is transactional; services raise, never return sentinels.
- **Deferred:** login brute-force throttling not added (no finding mandates it) — candidate hardening.

## Recent decisions (2026-08-01, R1)
- **Phase R1 executed & verified.** 6 domain apps: `accounts`, `appointments`, `wellness`,
  `content`, `chat`, `community`. **19 models** = 20 source tables − `refresh_tokens`
  (→ SimpleJWT `token_blacklist`). All PKs UUID (incl. `chat_rooms`/`chat_messages`, formerly
  Stream string IDs — realtime is now FastAPI-owned). `parent_id` kept as a loose pointer (no FK).
- **App split**: models never move between apps after this (migration-history cost). Locked.
- **BUG-6** fixed: `appointments.DEFAULT_DURATION_MINUTES = 60`, single source for serializers/services.
- Fixed two latent R0 defects found during R1: broken structlog `LOGGING` (string processor →
  every log record errored) and missing `bcrypt` dependency (any `set_password()` crashed).
- `libs/db` now runtime-wired into the FastAPI image (build context → repo root); reflected at boot.

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

## Next steps (Phase R done → Stillwater)
1. **Runtime-verify chat** on a device/simulator (`node dev.js`): room list, open room, two-client
   send/typing/history. The only backend piece not exercised live is the WS message round-trip.
2. **SEC-9** (deferred): move `accessToken`/`refreshToken` from AsyncStorage → `expo-secure-store`
   in `src/services/api.js` (critical auth path — do with a runtime). Retire `cloudinaryUpload.ts`.
3. **Stillwater 0–10** on the Python backend (payments P5 brings Pesapal + SEC-8 IPN HMAC).
4. Start **Pesapal merchant onboarding** (long pole, ~1–2 wk approval) — in parallel.

## Older next-steps (superseded — kept for history)
1. **R4c-2 — chat UI screens (needs Expo runtime).** Rewrite `ChatRoomScreen.tsx` + `ChatComponent.tsx`
   + `CustomMessage.tsx` + `(users|consultants|tabs)/chat.tsx` + `_layout.tsx` off Stream components
   onto `useChatContext()` (native): room list via `fetchRooms()`, history via `loadHistory(roomId)`
   or the `room_history` frame, `sendMessage/sendTyping/joinRoom/sendReadReceipt`, typing indicators
   from `typingUsers`. Then remove `stream-chat`/`stream-chat-expo`/`stream-chat-react-native*` from
   `package.json` and any `OverlayProvider`/Stream client wiring. Verify by running the app. (Bundle
   SEC-9: move tokens to `expo-secure-store`.)
2. **R7 — cutover + delete Node.** Gateway routes all `/api/**` to Django, `/ws` to FastAPI; run the
   parity harness green; delete `backend/`. Retire frontend `cloudinaryUpload.ts` + `stream-chat-*`
   (R4c-2). Remove the transitional Node port (10005) + `getstream`/`cloudinary` deps. PERF-6 (dep removal).
3. **R4c-2 — chat UI screens** (needs Expo runtime). **Blocked on a device/simulator** — 4,294 lines
   of Stream-based RN UI across 6 files; can't be rewritten/verified without `tsc` + a runtime (frontend
   deps aren't installed here). Precise build spec: **`docs/R4c-2-chat-ui-handoff.md`**. The native
   client (`ChatContext.js`) + backend are done and tested; this is pure UI + `stream-chat-*` dep removal.
4. Start **Pesapal merchant onboarding** (long pole, ~1–2 wk approval). Pesapal IPN (SEC-8 webhook
   HMAC) + Collections/Disbursements land with payments (post-R, Stillwater P5).
5. After Phase R lands → Stillwater 0–10 on the Python backend.

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
