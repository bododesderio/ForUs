<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
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


## [2026-08-01] — Phase R1 complete: 18-table schema → 19 Django models
- **Decisions:**
  - 6 domain apps: accounts / appointments / wellness / content / chat / community (locked — no cross-app model moves).
  - 19 models = 20 source tables − `refresh_tokens` (→ SimpleJWT `token_blacklist`). `AUTH_USER_MODEL=accounts.User` (email login, UUID PK).
  - ALL PKs UUID incl. chat_rooms/chat_messages (were Stream string IDs; realtime now FastAPI-owned). `parent_id` = loose UUID pointer, no FK (matches source).
  - Abstract bases in `core/models.py`: UUIDModel, CreatedModel, TimeStampedModel, SoftDeleteModel (+ managers). Compose per table's timestamp/soft-delete shape.
- **Patterns:**
  - `libs/db/tables.py`: async `reflect(engine)` → shared MetaData; `table(name)` → Core Table. FastAPI reflects at boot (lifespan), reads read-only.
  - FastAPI image build context = repo root so `libs/` is baked in; pytest `pythonpath=["../.."]` so `libs.db` imports from the service dir.
  - Schema parity > lint: `ignore=["DJ001"]` (nullable string cols match source), migrations excluded from ruff.
- **Gotchas (R0 defects found & fixed in R1):**
  - `LOGGING` passed `processor` as a dotted STRING → ProcessorFormatter tried to call a str → every log record errored. Fix: real `JSONRenderer()` + `foreign_pre_chain`.
  - `bcrypt` not in django-api deps → any `set_password()` crashed (hasher lib missing). Added `bcrypt>=4.1`.
  - ⚠ R2: settings lists `BCryptSHA256PasswordHasher` first — does NOT read plain `bcryptjs` hashes. Swap to `BCryptPasswordHasher` in R2.
- **Verified:** migrate up+down+up on scratch DB (compose pg, host 10010); Admin lists all 19; Core reads a UUID user row; ruff+pytest green both services; fastapi image builds with libs.
- **Resume:** R2 (DRF SimpleJWT auth) + Pesapal onboarding. See CONTEXT.md "Next steps".

## [2026-08-01] — Phase R2 complete: /api/auth/* on DRF SimpleJWT
- **Decisions:**
  - Envelope parity with Node: {success, message, user, accessToken, refreshToken}. login 200, register-user 201, register-consultant 200 (quirks kept). Login failures 400 with exact messages ("User does not exist." / "Invalid credentials." / "Account is deactivated.").
  - SEC-3: refresh rotates (returns NEW refreshToken) + blacklists old (reuse → 403). Needed ONE additive frontend edit: api.js refresh interceptor persists res.data.refreshToken if present (safe for Node, which never sends one).
  - SEC-1: /auth/push-token auth-gated, owner=request.user (no authId in body). /auth/send-notification NOT exposed (was unauth) → becomes Celery task in R6.
  - Hasher: BCryptPasswordHasher (NOT BCryptSHA256 — that pre-hashes SHA256 and can't read bcryptjs). Bare Node $2b$ hashes need `bcrypt$` prefix at data-copy time.
  - ARCH-2: core/exceptions.py normalizes ALL DRF errors → {success, message, errors}; frontend reads .message. register_user/register_consultant transactional in accounts/services.py; services raise, never {success:false}.
  - JWT access+refresh carry email+role claims (accounts/tokens.py) for FastAPI to authorize in R4.
- **Files:** accounts/{serializers,views,urls,services,tokens}.py + tests/test_auth.py; forus/urls.py (+/api/auth/); settings PASSWORD_HASHERS; core/exceptions.py; frontend/src/services/api.js (refresh rotation).
- **Gotchas:**
  - Profile.user is FK not OneToOne (R1 parity) → access via Profile.objects.filter(user=...).first(), not user.profile.
  - DRF default perm = IsAuthenticated → register/login/refresh/logout need explicit AllowAny.
  - RefreshToken(str) construction already raises on a blacklisted token (BlacklistMixin.verify) → that IS the reuse check; then .blacklist() to rotate.
- **Verified:** 16 django tests green (2 health + 14 auth), ruff clean. Postgres 10010.
- **Deferred:** login throttling (no finding). **Resume:** R3 (core CRUD: users/appointments/events/mood/resources/activities) + Pesapal onboarding.

## [2026-08-01] — Phase R3a+R3b: mood, activities, events, resources (DRF)
- **Scope:** R3 = 6 CRUD domains ~42 eps. Done this pass: mood(2), activities(1), events(5), resources(2). Remaining: appointments(15, R3c), users(17, R3d).
- **Decisions:**
  - DRF **APIViews not ModelViewSets** — Node paths are non-RESTful (/events/get, /events/details/:id, /resources/upload); APIViews preserve exact paths/shapes/status codes.
  - Success responses copy Node shapes exactly (parity gate). Only the ERROR contract is normalized (ARCH-2 handler). Hand-return Node's precise error bodies (e.g. mood {message:'Date is required'}) instead of raising ValidationError, so harness diffs clean.
  - BUG-4 fixed via core/permissions.IsAdminRole → non-admin event create/update/delete = 403 (Node hung). Event update = true PATCH (only supplied fields; Node nulled omitted).
  - Events pagination = Node offset envelope {page,limit,total,pages} (parity, not cursor). Resources list public (AllowAny); soft-deleted hidden by default manager.
  - Resource "upload" = record CRUD with file_url in body; real multipart→R2 is R5.
- **Files:** core/permissions.py; wellness/{serializers,views,urls}.py; content/{serializers,views,urls}.py; accounts ActivityListView + serializer + urls_activities.py; forus/urls.py mounts (/api/mood, /api/activities, /api/ for content). Tests: wellness/tests/test_mood, content/tests/test_{events,resources}, accounts/tests/test_activities.
- **Gotchas:** mount /api/mood via path("api/mood", include(wellness.urls)) + path("") to avoid trailing-slash redirect. content mounted at path("api/") alongside core — full subpaths (events/..., resources).
- **Verified:** 33 django tests green (16 prior + 17 new), ruff clean. **Resume:** R3c appointments (read AppointmentController.js + AppointmentServices.js; conflict detection + auto-cancel + state machine), then R3d users.

## [2026-08-01] — Phase R3c: appointments (15 eps, DRF)
- **Files:** appointments/{services,views,urls}.py + tests/test_appointments.py; forus/urls.py (+/api/appointments/). Logic in services.py, status/shape decisions in views (parity-visible).
- **Decisions:**
  - Conflict detection = point-in-interval over ACTIVE_STATUSES (pending/confirmed/in_session): existing.start ≤ new_start ≤ existing.start+duration. Filter appointment_datetime__lte=new_start then check end in Python. Reused on create + reschedule (exclude_id=self).
  - Auto-cancel: pending/confirmed with start < now-15min → bulk .update(status=cancelled, reason='Missed/Expired', updated_at=now). Runs on every list fetch. Celery schedule is R6.
  - BUG-6: create/block default duration = DEFAULT_DURATION_MINUTES (60), not Node's 90.
  - [SECURITY] Closed latent IDOR: /appointments/user/<id> + /consultant/<id> require owner-or-admin (Node had none). Availability stays open (booking needs it). No R3 finding mandated this — proactive.
  - State machine: confirm/reject only from pending (ConfirmView._transition reused by reject); users may only cancel/in_session via /status; review needs a completed appt + unique per (user,consultant), refreshes consultant_details.rating.
  - Perspective join (build_appointment_list): user/consultant/admin get different joined profile+email+review fields matching Node SELECT column names; batched (no N+1).
  - Push notifications on transitions all deferred to R6.
- **Gotchas:** UUID PKs → dropped Node's isNaN(consultantId) validity check (always true for UUIDs). URL order: literal (create/get/all/block) + typed converters; consultant/<id>/availability distinct from consultant/<id>.
- **Verified:** 49 django tests green (33 prior + 16 appt), ruff clean. **Resume:** R3d users (17 eps) — last of R3; read UserController.js + UserServices.js; apply same owner-or-admin guard.

## [2026-08-01] — Phase R3d: users (17 eps) — R3 COMPLETE
- **Files:** accounts/user_{views,services,urls}.py + tests/test_users.py; forus/urls.py (+/api/users/). User endpoints live in accounts (User/Profile/ConsultantDetails) + import content.Notification.
- **Decisions:**
  - Payload builders (user_services.py) mirror Node SELECT columns exactly: profile_payload (self, +consultant fields), user_detail_payload, consultant_detail_payload, list_consultants/list_users (offset pagination + sort map + search/profession/role filters). Sort maps use reverse-FK lookups (profile__first_name, consultant_detail__rating).
  - [SECURITY] GET /users admin-only (Node leaked all emails/PII). send-notification (+consultant) admin-only (Node let anyone push to any id — SEC-1 class); delivery deferred to R6, persists a notifications row.
  - push-token/notification read/preference derive owner from request.user; mark-read filter(recipient=request.user) so cross-user marking is a no-op. delete user/consultant = soft (User.delete sets deleted_at+is_active=False), admin-only.
  - The frontend's real /users/push-token + /users/consultant/push-token live here (R2 auth push-token stays for SEC-1).
- **R3 COMPLETE:** 6 domains, ~42 eps, 59 django tests. Resolves BUG-4, BUG-6, ARCH-2, ARCH-3, PERF-1(reads) + 3 proactive security fixes. Push delivery + auto-cancel scheduling → R6.
- **Gotchas:** URL order — consultant/{notifications,push-token,send-notification} literals before consultant/<uuid:pk> (uuid converter is strict so safe either way). NotificationsView reused for /notifications and /consultant/notifications (Node getConsultantNotifications == getNotificationsForUser(req.user.id)).
- **Resume:** R4 — chat REST to Django + realtime to FastAPI WS (Redis pub/sub), drop Stream Chat. SEC-2/SEC-4/BUG-7/PERF-3..6/ARCH-5. Read chatRoutes.js, ChatController.js, ChatService.js, ws.js; frontend ChatContext.js.
