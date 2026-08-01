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

## [2026-08-01] — Phase R4a: chat REST (Django)
- **Files:** chat/{services,views,urls}.py + tests/test_chat.py; forus/urls.py (+/api/chat/).
- **Endpoints:** POST/GET /api/chat/rooms (create + list, one RoomsView — Node served both on same path), GET /rooms/<uuid>/messages (membership-gated 403, paginated limit/before, joined profile fields, reversed asc), POST /rooms/<uuid>/join.
- **SEC-2 join authz (chat/services.can_join):** already-member OR room.type in {livestream,team} (open) OR appointment links requester to a current member (Appointment where user/consultant matches a member). Messaging rooms deny arbitrary self-join. History (getRoomMessages) already membership-gated in Node — kept.
- **Dropped Stream:** /token + /webhook routes gone. Token issuance → WS ticket in R4b.
- **Message sending is realtime (R4b), not REST.** getUserRooms last_message via Subquery(OuterRef). ChatMessage.objects (SoftDeleteManager) hides deleted.
- **Verified:** 65 django tests green (59 + 6 chat), ruff clean.
- **Resume R4b (FastAPI WS /ws):** events send_message/typing/read_receipt/join_room. BUG-7 persist-then-broadcast. Redis pub/sub fan-out (multi-worker; Node used in-proc Map). SEC-4 WS ticket auth (Redis ~30s single-use; add GET /api/chat/token in Django). SEC-2 membership on send+join_room history. Read backend/ws.js + ChatService.js (already read). Then R4c frontend ChatContext.js + drop stream-chat-* deps.

## [2026-08-01] — Phase R4b: FastAPI WebSocket chat realtime
- **Django side:** chat/tickets.py (issue_ticket → Redis SETEX ws:ticket:<t>=user_id, 30s) + WsTicketView (GET /api/chat/token). redis-py sync client, module-cached.
- **FastAPI side:** app/chat/{tickets,repo,manager,ws}.py + main.py wiring.
  - tickets.consume_ticket: redis.getdel (single-use, SEC-4). Falsy ticket → None without touching redis.
  - repo (SA Core over reflected libs.db tables, async): is_member, member_ids, persist_message (UUID id + created/updated_at supplied since model uses auto_now_add = no DB default), touch_room, fetch_history (LEFT JOIN profiles for author fields, reversed oldest-first). FastAPI writes DML (messages) but never DDL.
  - manager: ConnectionManager (user_id→set[ws], per-worker) + MembershipCache (10s TTL, room→member_ids to spare DB on typing spam). Uses time.monotonic (OK in app runtime; Date.now ban is workflow-scripts-only).
  - ws.py: /ws endpoint. Auth via ?ticket. Events send_message/typing/read_receipt/join_room. BUG-7: persist inside engine.begin() transaction, publish to Redis channel "chat:events" ONLY after commit. SEC-2: is_member check on send AND join_room history (Node join_room lacked it). Fan-out: pubsub_listener task (started in lifespan) receives published events, resolves room members (cached), send_local to locally-connected members. Multi-worker via Redis (PERF-3..6; Node used in-proc Map).
  - main.py lifespan: chat_manager, chat_members_cache, asyncio task pubsub_listener; add_api_websocket_route("/ws").
- **Tests:** django chat/tests/test_ticket.py (needs redis → compose 10011). fastapi tests/test_chat_manager.py (unit, no infra), test_chat_ws.py (WS no-ticket reject via TestClient + guarded repo integration against compose DB 10010/redis 10011, seeded in a rolled-back transaction). CI: integration test SKIPS (fastapi CI job has no migrated schema); auth+unit run.
- **Verified:** 78 tests (67 django + 11 fastapi), ruff clean. compose redis started (10011).
- **Resume R4c (frontend):** ChatContext.js → wss://gateway/ws?ticket=(GET /api/chat/token); native WS protocol; remove stream-chat* deps. Then R5 media→R2.

## [2026-08-01] — Phase R4c-1: ChatContext.js (native WS client)
- **Surprise:** ChatContext.js was ALREADY a native WebSocket client (not Stream). The Stream dependency is in the SCREENS (ChatRoomScreen.tsx uses `client.deleteMessage`, Stream <Channel>/<MessageList>; _layout OverlayProvider). So R4c splits: R4c-1 context (done), R4c-2 screen rewrite + dep removal (remaining, needs Expo runtime).
- **R4c-1 changes (ChatContext.js):** connect() now GET /api/chat/token (Bearer) → wss://gateway/ws?ticket= (SEC-4, no token in URL). normalizeMessage() maps snake_case (my backend) ↔ camelCase for new_message + room_history so UI renders consistently. Added authFetch, fetchRooms() (GET /chat/rooms), loadHistory(roomId,before) (GET /chat/rooms/:id/messages) — exposed in context so screens can drop the Stream client. Event protocol already matched (send_message/typing/read_receipt/join_room).
- **CANNOT run Expo/RN here** — .tsx screen rewrite + `stream-chat-*` dep removal deferred (removing deps before screens migrate would break the build). node --check passed on ChatContext.js.
- **R4c-2 files to migrate:** ChatRoomScreen.tsx, ChatComponent.tsx, CustomMessage.tsx, (users|consultants|tabs)/chat.tsx, _layout.tsx. Deps to remove: stream-chat-expo, stream-chat-react-native, stream-chat-react-native-core (package.json:65-67). Bundle SEC-9 (expo-secure-store for tokens).
- **Resume:** R4c-2 (with app runnable) or R5 (media→R2). Backend chat is complete + tested.

## [2026-08-01] — Phase R5: media upload → Cloudflare R2 (Django, backend)
- **Files:** core/media.py (sniffer + store), core/views.py UploadView, core/urls.py (+/api/upload), settings (R2_PUBLIC_URL, MAX_UPLOAD_BYTES), infra/.env(.example) MAX_UPLOAD_BYTES. Tests: core/tests/test_upload.py.
- **Finding:** Node StorageService ALREADY used R2 (@aws-sdk/client-s3). Cloudinary survived only client-side (frontend cloudinaryUpload.ts direct-to-Cloudinary + /cloudinary-signature Node route). So R5 backend = port POST /api/upload to Django with SEC-6.
- **SEC-6:** oversize rejected before streaming (Django spools >2.5MB to temp file — no multer 50MB memory buffer). Real content-type SNIFFED from magic bytes (core.media.sniff_content_type: jpeg/png/gif/webp/wav/pdf/mp4/mp3), client mimetype ignored → .exe-as-.png rejected. Random uuid key + sniffed ext (not client filename). Stream via default_storage.save(key, file_obj) (django-storages S3Storage→R2 from R0 STORAGES). URL = R2_PUBLIC_URL/key (or storage.url fallback).
- **Parity:** {success:true, url} / 400 {success:false, message}. Frontend uploadService.ts already POSTs FormData 'file' to /api/upload → no change. cloudinaryUpload.ts removal = frontend task (R4c-2/R7).
- **Tests:** override_settings STORAGES=InMemoryStorage so no real R2 hit; sniff unit + valid/spoofed/no-file/oversize/auth. 84 total (73 django + 11 fastapi), ruff clean.
- **Resume:** R6 Celery (reminders, auto-cancel schedule, all deferred push notifications via httpx→Expo, BUG-5) OR R4c-2 frontend chat UI. Then R7 cutover + delete backend/.

## [2026-08-01] — Phase R6: Celery jobs (reminders + auto-cancel)
- **Files:** core/push.py (send_expo_push httpx→Expo + notify()), appointments/tasks.py, appointments/services.upcoming_appointments(), settings (CELERY_BEAT_SCHEDULE + crontab + CELERY_TIMEZONE), infra/docker-compose celery `worker -B`. Tests: appointments/tests/test_tasks.py.
- **BUG-5 fixed:** notify(user,title,body,data) persists exactly ONE content.Notification (recipient=user, non-null) + best-effort Expo push if profile.push_token && notifications_enabled (failure swallowed, logged). Node reminderJob passed {userId,consultantId} to saveNotification (wanted {recipientId}) → null recipient_id crash every run + double-save.
- **Tasks (shared_task, explicit name=):** appointments.tasks.send_appointment_reminders (15-min-ahead, one notify per recipient) + appointments.tasks.cancel_expired_appointments (calls services.cancel_expired_appointments). Beat: both */5 via CELERY_BEAT_SCHEDULE. Embedded beat (worker -B) — split to dedicated beat if worker scales out.
- **notify() is the shared push helper** the R3c/R4 state-change push points (deferred to R6) can now adopt — not yet retrofitted (scope). streak/payout tasks come with Stillwater P3/P5.
- **Tests:** upcoming window, BUG-5 (2 rows/appt one per recipient), push gating (opted-in→pushed, disabled/tokenless→skip), cancel task, invalid-token ValueError. Push monkeypatched (no network). 90 total (79 django + 11 fastapi), ruff clean. Verified tasks register + beat loads via celery loader.
- **Resume:** R7 cutover (route all →Python, parity harness, delete backend/) OR R4c-2 chat UI. Phase R nearly done: R0-R6 ✅ (minus R4c-2 UI).

## [2026-08-01] — Phase R7: cutover + delete Node
- **nginx gateway** (infra/nginx/nginx.conf): fixed `location /ws/` → `location /ws` (prefix) so the exact `/ws` path the client connects to routes to FastAPI (was a 404 gap). /api→django, /rt+/ws→fastapi, /api/admin→django. Already Python-only otherwise.
- **dev.js**: repointed from Node backend (:10005, nodemon server.js) to the Python stack behind the gateway (:10000, `docker compose up` in infra/). Writes frontend .env API_BASE_URL=http://IP:10000/api. dotenv → infra/.env.
- **Deleted:** backend/ (Node, 48 files) + root docker-compose.yml (Node stack). Remaining top-level: docs frontend infra libs services. getstream/cloudinary/express deps gone with backend/package.json (PERF-6).
- **README** updated: stack (Django+FastAPI), quickstart (infra compose), project layout, conventions (DRF/SimpleJWT/structlog), chat (native WS).
- **Verified cutover:** built + `docker compose up -d --build`; all healthy. Through gateway :10000 — /api/health 200, /rt/health 200, /api/admin/login 200, /ws WS-upgrade → FastAPI 403 (no ticket = correct SEC-4), celery beat scheduling send_appointment_reminders. compose config valid. 90 tests green (79 django + 11 fastapi), ruff clean both.
- **Phase R = COMPLETE** except R4c-2 (frontend chat SCREENS still on Stream components — needs Expo runtime to rewrite+verify). Node is gone; the parity harness's Node reference no longer exists (tests are self-contained, don't import backend/).
- **Resume:** R4c-2 chat UI (Expo) OR Stillwater 0-10 on the Python backend.

## [2026-08-01] — Phase R4c-2: native chat screens (Stream removed) — PHASE R COMPLETE
- **Unblocked:** ran `npm install` in frontend (1106 pkgs) → got tsc. Baseline `tsc --noEmit` = 1 pre-existing fatal parse error in src/data/event-data.ts (masks ~242 pre-existing strict noImplicitAny errors app-wide — app runs via Metro/Babel, tsc was never their gate). Chat files: 0 errors before+after.
- **Discovery:** ChatComponent.tsx + CustomMessage.tsx were ORPHANED (nothing imported them) → deleted. List screens (tabs/users/consultants chat.tsx) referenced context.client/createRoom that native ChatContext didn't have (half-migrated) + tons of commented dead code.
- **Done:** src/components/ChatRoomList.tsx (shared native list: fetchRooms + FlatList + create-group modal + navigate). 3 chat tabs → thin wrappers rendering <ChatRoomList/>. ChatRoomScreen.tsx rewritten native (useLocalSearchParams roomId/roomName; joinRoom+loadHistory; inverted FlatList of messages[roomId]; TextInput+send; throttled sendTyping; sendReadReceipt on latest incoming). ChatContext.js += createRoom() (POST /api/chat/rooms). Removed stream-chat/stream-chat-expo/stream-chat-react-native(-core) from package.json + lockfile (npm install pruned 51 pkgs).
- **Verified:** no stream-chat imports in src; tsc 0 errors in all chat files; project total unchanged (1 pre-existing). Reverted an out-of-scope event-data.ts fix to keep R4c-2 diff focused.
- **NOT runtime-verified** (no simulator). v1 defers reactions/threads/attachment-preview/audio/rich-user-search (Stream-only). Handoff/parity notes in docs/R4c-2-chat-ui-handoff.md.
- **PHASE R COMPLETE (R0–R7).** Next: device runtime-verify chat + SEC-9 (secure-store) + Stillwater 0–10 on Python backend. Node gone.

## [2026-08-01] — Stillwater P4 (community feed) BACKEND on Python
- **Context:** Phase R done → started Stillwater on Django/FastAPI. Stillwater plan is Node-oriented; P1 schema absorbed by R1, P0 test-harness by Phase R. Reconciliation banner added to docs/plans/stillwater-implementation-plan.md.
- **Built:** community/{services,serializers,views,urls}.py + tests/test_community.py on the R1 community_* models (were schema-only/ARCH-4). Mounted /api/community/.
  - GET/POST /api/community/posts (paginated feed w/ like_count+comment_count+liked via annotate/Count; create). GET/DELETE /posts/<id> (detail; soft-delete owner/admin). POST/DELETE /posts/<id>/like (idempotent get_or_create / filter-delete). GET/POST /posts/<id>/comments. DELETE /comments/<id> (owner/admin).
  - Greenfield (no Node parity — community was never wired). Envelope {success, posts/post/comments, pagination}. Pseudonymous: author = {id, username, profile_image} — username handle, NEVER real name. Content length caps (5000/2000) as moderation stand-in (P7).
- **Follow-ups (need schema/UI/runtime):** groups (GET /groups, join) + typed reactions (support|same|hugs) need new tables; feed UI (B-1 design blocker); @adjective_noun_NN handle generation on signup (accounts.register).
- **Verified:** 8 community tests (create/feed/pseudonymity, like idempotency+unlike, liked flag per-caller, comments+counts, owner/admin delete, soft-delete→404, auth). Full: 98 tests (87 django + 11 fastapi), ruff clean.
- **Next verifiable backend:** deferred push wiring (notify() into appointment/chat state changes); P2 forgot-password + email (Resend stub) + email_verified. External-dep phases (P5 payments/Pesapal, P6 video/Agora) gated on onboarding.

## [2026-08-01] — Stillwater P2 backend: forgot-password + email verification
- **Files:** core/email.py (Resend via httpx, no-op without RESEND_API_KEY → tests never hit network). accounts/views.py += ForgotPasswordView/ResetPasswordView/RequestEmailVerificationView/ConfirmEmailVerificationView. accounts/urls.py routes. settings RESEND_API_KEY/EMAIL_FROM/FRONTEND_URL. Tests: accounts/tests/test_password_email.py (7). Also wired notify() into appointment create/confirm/cancel/start-session/review (test_notifications_wiring.py, 4).
- **Forgot-password:** POST /api/auth/forgot-password {email} → PasswordResetToken (R1 model, 1h expiry) + email link; ALWAYS 200 (no account enumeration). POST /api/auth/reset-password {token,newPassword} → validate (unused+unexpired), validate_password, set_password, mark used_at, record_activity. Reused/expired token → 400.
- **Email verify:** DB-free signed token (django.core.signing.TimestampSigner salt='forus:email-verify', 24h). verify-email/request (auth) emails link; verify-email/confirm {token} → email_verified=True. Bad/expired → 400.
- **Gotcha:** don't put a module-level constant (EMAIL_VERIFY_SALT) between import groups → E402 breaks subsequent imports. Put constants after ALL imports.
- **Verified:** 109 tests (98 django + 11 fastapi), ruff clean.
- **Next:** register could auto-send verification email + assign pseudonymous handle (P4). External: P5 payments (Pesapal), P6 video (Agora). SEC-9 secure-store (frontend, device).

## [2026-08-01] — Stillwater P3 backend: stats, rich check-in, search, streaks
- **Schema (reversible migration, additive columns — safe non-locking):** moods += mood_color(varchar), feeling_tags(jsonb default list), note(text); profiles += streak_days(int default 0). accounts/migrations/0002, wellness/migrations/0002. Verified up+down+reapply, makemigrations --check clean.
- **Endpoints:** POST /api/mood now saves color/tags/note (backward-compat). GET /api/profile/stats (wellness.ProfileStatsView) → {streak_days (compute_streak: consecutive days ending today-or-yesterday), total_sessions + total_practice_minutes (completed appts as user), mood_trend_30d}. GET /api/search (content.SearchView) → federated resources (title/category/author icontains) + consultants (name/profession/email icontains). Mounted at /api/profile/stats + /api/search in forus/urls.
- **Celery:** wellness.tasks.recompute_streaks (daily crontab hour=0 min=30) caches profiles.streak_days for users who checked in in last day. compute_streak lives in wellness/views.py (imported by task).
- **Verified:** 5 P3 tests (rich check-in, stats streak/sessions/minutes/trend, streak task, auth, search federation). Full: 115 tests (104 django + 11 fastapi), ruff clean.
- **NOTE:** running django container is pre-P3 (old image) — new endpoints need a rebuild to serve live; tests are authoritative. Screens (ScreenHome/CheckIn/Library/Player/Profile stats) are B-1 design-blocked + need Expo runtime.
- **Next:** P7 crisis/moderation (new schema) or P8-10, or external P5/P6. Frontend needs device.
