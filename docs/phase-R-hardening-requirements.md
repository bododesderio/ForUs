<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# ForUs — Phase R Hardening Requirements

**Source:** as-built audit of the Node/Express backend + Expo frontend (2026-07-31).
**Purpose:** the Node backend is deleted at Phase R7 (see `ADR-001`). These findings are
**not** a Node fix list — they are **acceptance criteria for the Django + FastAPI rebuild**
so the same defects are never reintroduced. Each item has an ID, severity, evidence, the
required behaviour on the target stack, the owning R-phase, and how it is verified.

Legend — Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low.
Every REST path/shape the Expo app already calls must be preserved (parity harness is the
cutover gate) unless a change ships with a matching frontend edit.

---

## 1. Security

| ID | Sev | Finding (evidence) | Required behaviour on target | Phase | Verified by |
|----|-----|--------------------|------------------------------|-------|-------------|
| SEC-1 | 🔴 | `POST /api/auth/push-token` & `/api/auth/send-notification` have **no auth** and take `authId` from the body → any anon caller hijacks a user's push token or blasts push to anyone. (`authRoutes.js:14-15`, `AuthController.js:157-181`) | Both require a valid access token; identity is derived **only** from `request.user`, never from the body. `send-notification` is not a public endpoint — internal/service-only (Celery) or admin-gated. | R2 | Parity harness: unauthenticated call → 401; authenticated call cannot target another user's id. |
| SEC-2 | 🔴 | Private chat rooms have **no real access control**: `POST /rooms/:roomId/join` lets any user self-join any room (`ChatController.js:100-113`), and the WS `join_room` returns last 50 messages with **no membership check** (`ChatService.js:132-146`). Reads any therapist↔patient conversation. | Membership is authorization-gated: a user may only be added to a room by an existing owner/moderator or an appointment-derived rule. **Every** room operation (REST and WS: history, send, typing, receipts) checks membership server-side on each call. | R4 | Two-user test: non-member `join`/`ws join_room`/`get messages` → 403; member succeeds. |
| SEC-3 | 🟠 | No refresh-token rotation; `findRefreshToken` ignores `expires_at` (`AuthServices.js:155`) while middleware checks it (`auth.js:42`) — two divergent refresh paths, one dead & weaker (`AuthController.refresh`). | SimpleJWT with **rotation + blacklist on use**; single refresh path; reuse of a rotated token is detected and revokes the family. Access 15m / refresh 7d. | R2 | Refresh returns a new refresh token; replay of the old one → 401 + family revoked. |
| SEC-4 | 🟠 | WS auth token is passed in the **query string** (`?token=`, `ChatService.js:42`) → leaks into access logs/proxies; HTTP logger also logs full URLs. | WS auth via a short-lived single-use ticket or the `Sec-WebSocket-Protocol` header; tokens never appear in URLs or logs. Log redaction for `authorization`/`token`. | R4 | Access logs contain no token material; WS rejects tokens supplied via query string. |
| SEC-5 | 🟡 | Secrets are read from ambient env with no fail-fast; **no dotenv is loaded at runtime** (`node server.js`), so a missing `JWT_SECRET`/`DATABASE_URL` fails silently/late. | Settings validate all required secrets **at startup** (Django system check + FastAPI `pydantic-settings`); the process refuses to boot if any required var is unset. No secret has an insecure default. | R0 | Boot with a required var unset → immediate, explicit failure (covered by R0 scaffold). |
| SEC-6 | 🟡 | Uploads buffer 50 MB in memory (`multer.memoryStorage`) and trust the client mimetype (`uploadRoutes.js`) → memory-pressure DoS + type spoofing. | Stream to R2 (or presigned PUT); enforce size caps before buffering; sniff real content-type server-side; re-encode/strip metadata on images. | R5 | Oversized upload rejected pre-buffer; a `.exe` renamed `.png` is rejected on content sniff. |
| SEC-7 | 🟡 | Raw `error.message` returned to clients in several handlers (`savePushToken`, `/api/upload`). | Uniform exception handler: generic message in prod, detail only in logs; no stack/driver text crosses the API boundary. | R0/R2 | Forced 500 in prod mode returns a generic body; detail present only in structured logs. |
| SEC-8 | ⚪ | Webhook signature verifier is a **no-op** `next()` (`ChatController.js:120`); raw-body plumbing exists for a dead endpoint (`server.js:75-84`). | Every inbound webhook (Pesapal IPN, any provider) verifies an HMAC/signature against the raw body before processing; unsigned/invalid → 403. No pass-through verifiers. | R4/R5 | Tampered IPN payload → 403; valid signature → processed exactly once (idempotent). |
| SEC-9 | 🟠 | **Frontend:** access/refresh tokens + user data stored in **plaintext AsyncStorage**, not SecureStore (`services/api.js:20-37`). | Tokens stored in `expo-secure-store` (Keychain/Keystore); AsyncStorage holds only non-sensitive UI state. | R4 (frontend touch) / Stillwater P0 | Device storage inspection shows no bearer tokens in AsyncStorage. |

---

## 2. Correctness / data-integrity

| ID | Sev | Finding (evidence) | Required behaviour on target | Phase | Verified by |
|----|-----|--------------------|------------------------------|-------|-------------|
| BUG-1 | 🔴 | **The Node backend does not boot as written**: `chatRoutes.js:4` imports `generateChatToken`, which `ChatController.js` never exports → ESM `SyntaxError` at startup. | N/A to rebuild, but the class of defect (route wired to a missing handler) is caught: CI runs an import/boot smoke test and route-coverage test so a dangling handler fails the build. | R0 (CI) / R4 | CI boot test imports the app and asserts every route resolves to a callable. |
| BUG-2 | 🟠 | `register`/`consultant` catch blocks `return {obj}` instead of `res.json(...)` (`AuthController.js:34,62`) → client hangs until timeout on a DB error. | DRF returns a response for every code path; unhandled exceptions → uniform 500 via the exception handler. No handler can complete without responding. | R2 | Simulated DB error returns a JSON 500 promptly, not a hang. |
| BUG-3 | 🟡 | `consultant` references undefined `errors.array()` on missing fields (`AuthController.js:42`) → 500 instead of 400. | DRF serializer validation returns 400 with field errors. | R2 | Missing-field registration → 400 with per-field messages. |
| BUG-4 | 🟠 | `eventController.del`/`update` return a plain object (no `res`) for non-admins → request hangs; and `handleValidationErrors` is placed **before** the validators, so validation never runs (`eventRoutes.js`). | DRF permission classes (403 for non-admin) + serializer validation, both always producing a response. | R3 | Non-admin mutate → 403; invalid body → 400. |
| BUG-5 | 🟠 | `reminderJob` passes `{userId,...}` to `saveNotification`, which needs `{recipientId,...}` → `recipient_id NOT NULL` violation on every run; also double-saves. (`jobs/reminderJob.js`, `UserServices.js:342`) | Celery reminder task uses a typed payload; notification rows persist with the correct recipient; unit-tested. | R6 | Reminder task run persists exactly one row per recipient with a non-null `recipient_id`. |
| BUG-6 | 🟡 | Appointment default duration disagrees: model `60` (`schema.js:78`) vs `createAppointment` `90` vs `blockAppointmentSlot` `90`. | Single source of truth: model default; serializers/services inherit it. | R1/R3 | Creating an appointment without a duration yields the documented default consistently. |
| BUG-7 | 🟠 | Chat **broadcasts before persisting**, and persist is fire-and-forget (`ChatService.js:96-101`) → a failed INSERT means recipients saw a message absent from history. | Persist-then-broadcast (or transactional outbox): a delivered message is always in `chat_messages`. Delivery failures are retried, not silently dropped. | R4 | Kill the DB mid-send: the message is not broadcast (or is queued), and history == what was delivered. |

---

## 3. Performance / scalability

| ID | Sev | Finding (evidence) | Required behaviour on target | Phase | Verified by |
|----|-----|--------------------|------------------------------|-------|-------------|
| PERF-1 | 🟠 | `getAppointments` calls `cancelExpiredAppointments()` on **every read** (`AppointmentServices.js:136`) — full scan + JS loop + UPDATE + **synchronous push notifications inside a GET**. | Reads never mutate. Auto-cancel runs only in Celery-beat. List endpoints do zero writes and send zero notifications. | R3 + R6 | A GET issues no UPDATE/notification (asserted via query log); auto-cancel timing matches Node in the beat task. |
| PERF-2 | 🟡 | `cancelExpiredAppointments` loads all pending/confirmed rows into Node and filters expiry in JS (`AppointmentServices.js:7-22`). | Single set-based SQL: `UPDATE ... WHERE status IN (...) AND appointment_datetime < NOW() - INTERVAL '15 min'`. | R6 | One statement; no per-row round-trips. |
| PERF-3 | 🟠 | WS connections live in an **in-memory Map** (`ChatService.js:7`) and `ioredis` is a dependency **never instantiated** → chat breaks past one process. | FastAPI WS fans out via **Redis pub/sub**; any worker can deliver to any connected client. Horizontally scalable. | R4 | Two FastAPI workers: a message sent on worker A reaches a client on worker B. |
| PERF-4 | 🟡 | `broadcastToRoom` runs a membership `SELECT` on **every** message/typing/receipt event (`ChatService.js:15-29`). | Membership resolved from a cache (Redis) or subscription set, not a per-event DB query. | R4 | Steady-state message send issues no per-event membership SELECT. |
| PERF-5 | 🟡 | `getUserRooms` uses per-row correlated subqueries for last-message/-time (`ChatController.js:45-46`). | Single query (LATERAL / window function) for the room list + last message. | R4 | Room-list endpoint executes one query regardless of room count. |
| PERF-6 | ⚪ | Dead paid dependency: `StreamChatService.js` (259 lines) + `stream-chat`/`getstream` unused since native WS. | Stream Chat fully removed (code + deps); no per-MAU SaaS cost. | R4/R7 | `grep` for stream/getstream returns nothing; deps gone. |
| PERF-7 | 🟡 | **Frontend:** context `value` objects unmemoized in all four providers wrapping the whole app; `StyleSheet.create` called inside render bodies (`login.tsx:67`, chat, home). | Memoize provider values (`useMemo`); hoist stylesheets or build once per theme change. | Stillwater P0 | Profiler shows no app-wide re-render on unrelated provider state change. |

---

## 4. Architecture / maintainability

| ID | Sev | Finding (evidence) | Required behaviour on target | Phase | Verified by |
|----|-----|--------------------|------------------------------|-------|-------------|
| ARCH-1 | 🟠 | Drizzle schema is defined but **no service uses it** (raw `pool.query` everywhere); migrations are 2 files (one **0 bytes**) referencing **dropped tables**; DB is built by `drizzle-kit push` → **no reproducible migration history**. | **Django migrations are the single source of schema truth** (reversible, non-locking, per the `migrations` skill). FastAPI reads via SQLAlchemy Core reflection — it never runs DDL. | R1 | `migrate` applies **and** reverses on a scratch DB; CI runs it. |
| ARCH-2 | 🟡 | Services signal errors via `{success:false}` sentinels; controllers check them inconsistently → no uniform error contract. | One response envelope + DRF/FastAPI exception handlers; services raise typed exceptions, never return sentinels. | R2/R3 | Error responses share a documented shape across all endpoints. |
| ARCH-3 | 🟡 | Empty `AdminController`/`ConsultantController`/`consultantRoutes`; `middleware/admin.js` unused (inline role checks instead); `adminRoutes` commented out. | Authorization via DRF permission classes; admin surface via **Django Admin** (down-payment on Stillwater Phase 9). No dead stubs shipped. | R3 (+ R1 admin) | No empty modules; role checks are declarative permission classes. |
| ARCH-4 | ⚪ | Schema-only tables with no code: `community_*`, `password_reset_tokens` (a forgot-password rate-limiter exists but no route). | Carried into R1 models; wired by Stillwater (community P4, forgot-password P2). Documented as intentionally dormant. | R1 (carry) | Models + migrations exist; endpoints deferred and noted. |
| ARCH-5 | 🟠 | **Frontend** load-bearing defects: auth state duplicated across `authContext` **and** `userContext` (two `checkAuthStatus`, two `user` sources); chat is split between an **uninitialized Stream SDK** and a custom WS with a mismatched interface → chat cannot connect; community feed + onboarding run on **mock data**; **no error boundaries anywhere**; near-zero accessibility. | Single auth store; `ChatContext` repointed to the FastAPI `/ws` gateway path with the Stream SDK removed; feed backed by a real API; add a root error boundary; a11y labels on interactive elements. | R4 (chat repoint) + Stillwater (auth unify P0, feed P4, a11y) | Chat connects end-to-end against FastAPI; one auth source; feed reads the API. |

---

## 5. Cross-cutting invariants (apply to all phases)

- **UUID PKs** on all models (ADR-001); keep FK cascades + `deleted_at` soft-delete semantics.
- **API compatibility:** preserve existing REST paths/response shapes the Expo app calls; the
  parity harness (old Node vs new Python, identical requests, diffed responses) is the cutover gate.
- **Secrets:** validated at boot (SEC-5); redacted in logs (SEC-4/SEC-7).
- **Observability:** `structlog` structured logs (Django) + structured logging (FastAPI); no `console.log`.
- **Tests:** every ported behaviour lands with a pytest; CI gate = ruff + pytest + `migrate` up/down.

---

## Traceability summary (finding → owning phase)

| Phase | Findings resolved |
|-------|-------------------|
| **R0** | SEC-5, SEC-7 (handler), BUG-1 (CI boot/route test) |
| **R1** ✅ | ARCH-1 (Django-owned reversible migrations; FastAPI reflects via Core), ARCH-4 (`community_*` + `password_reset_tokens` modeled, dormant), BUG-6 (`DEFAULT_DURATION_MINUTES=60`) — verified up+down on a scratch DB, Admin lists all 19 models, Core reads a row |
| **R2** ✅ | SEC-1 (push-token auth-gated, owner=request.user; send-notification unexposed), SEC-3 (rotation+blacklist, reuse→403), SEC-7 (prod-safe messages), BUG-2 (every path responds), BUG-3 (missing fields→400), ARCH-2 (one `{success,message,errors}` envelope) — 14 auth tests green |
| **R3** ✅ | BUG-4 ✅ (events non-admin→403, true PATCH) · BUG-6 ✅ (duration 60) · ARCH-2 ✅ (one error envelope) · ARCH-3 ✅ (role checks are declarative permission classes; no dead stubs) · PERF-1 (reads use R1 indexes). Extra: appointment IDOR closed, `/users` PII admin-gated, `send-notification` admin-only |
| **R4** 🚧 | SEC-2 ✅ (REST + WS send/join_room membership) · SEC-4 ✅ (single-use WS ticket, no URL token) · BUG-7 ✅ (persist-then-broadcast) · PERF-3..6 ✅ (Redis pub/sub multi-worker fan-out) · ARCH-5 (chat unified on FastAPI) · SEC-9 pending R4c frontend · SEC-8 → R5 (Pesapal IPN) |
| **R5** ✅ | SEC-6 (oversize rejected pre-stream; magic-byte content sniff — spoofed ext rejected; client mimetype never trusted) |
| **R6** | PERF-1 (job side), PERF-2, BUG-5 |
| **R7** | PERF-6 (dep removal) |
| **Stillwater** | PERF-7, ARCH-5 (auth unify, feed, a11y), SEC-9 (if not done at R4) |
</invoke>
