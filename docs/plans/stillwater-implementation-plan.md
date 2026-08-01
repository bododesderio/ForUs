<!--
  @author Bodo Desderio <rooiboktechltd@gmail.com>
  @copyright 2026 Rooibok Technologies. All rights reserved.
-->
# ForUs — Stillwater Implementation Plan (Phases 0–10)

**Source of record:** `docs/STILLWATER_MIGRATION.md`
**Planned:** 2026-07-27 · **Status:** DRAFT for review — no code written, nothing committed.
**Executor:** run `/do` per phase after approval. Re-plan phases 6–10 as earlier phases land.

> **⚠️ SUPERSEDED SEQUENCING (2026-07-27):** This plan now runs **after** the backend
> re-platform — see `docs/plans/backend-replatform-plan.md` (Phase R) and
> `.claude/adrs/ADR-001-backend-replatform.md`. Every backend task below retargets from
> Express/Node to **Django (DRF)** for CRUD/payments and **FastAPI** for realtime/webhooks/
> AI, per the ADR. **Phase 1's schema is absorbed into Phase R1** (Django models + migrations,
> UUID PKs). **B‑1 is RESOLVED:** build screens from the doc spec + the existing 8-theme
> palette (no design-source files) — the `⟨design unresolved⟩` markers now mean exactly that.
> **B‑3/B‑4 are resolved** by Phase R (Django migrations + pytest). Frontend phases are unchanged.

> This plan is **not final**. Phases 5–10 depend on APIs (Pesapal, Agora, Resend) and on
> design-source files that are not yet resolvable (see Blocker B‑1). Treat phase estimates
> beyond Phase 4 as provisional; re-run `/make-plan` scoped to the next phase once each lands.

---

## ⚠️ Blockers & reconciliations (resolve before / during execution)

### B‑1 — Design-source files DO NOT EXIST (hard blocker for pixel-accurate porting)
The README/starter prompt asks to inventory primitives across `screens.jsx`, `user-app.jsx`,
`therapy-flow.jsx`, `admin.jsx`, `therapist-dashboard.jsx`, `ios-frame.jsx`, `android-frame.jsx`,
`browser-window.jsx`, `design-canvas.jsx`. **None exist in the repo or in git history**
(`git log --all` = 0 hits). Consequently:
- There is **no primitive-by-primitive design inventory to port from**.
- Every "design source" mapping below is marked **`⟨design unresolved⟩`** and uses the
  migration doc's screen *names/specs* as the spec of record instead.
- **Action required from the user:** provide the Stillwater design files (Figma export / JSX)
  OR confirm we build from the doc's textual spec + the existing 8-theme palette. Until then,
  Phase 0 primitives are built to the doc's list, not to a design file.

### B‑2 — Doc names Stripe & Stream Video; locked decisions override to Pesapal & Agora
`docs/STILLWATER_MIGRATION.md` line 116 lists `PaymentService (Stripe)` and
`VideoService (Stream Video)`. **Locked decisions win:** PaymentService → **Pesapal API v3**,
VideoService → **Agora (`react-native-agora`)**. This plan uses Pesapal/Agora everywhere.

### B‑3 — Migration strategy mismatch
`package.json` → `"migrate": "npx drizzle-kit push"` (non-versioned, auto-diff), but
`backend/migrations/` contains hand-written SQL and one **empty** file
(`20250921000000_add_profile_image_column.sql`, 0 bytes). Schema truth lives in
`backend/db/schema.js` (Drizzle table defs) yet **Drizzle is never used at runtime** — every
service is raw `pool.query` with `$1,$2`. **Decision:** keep raw-SQL data access; for schema
changes, update `schema.js` AND write a reversible SQL migration (the `migrations` skill governs
this — zero-downtime, reversible, non-locking). Do **not** rely on `drizzle-kit push` for
production. Phase 1 formalizes this.

### B‑4 — No test harness exists
`package.json` test script = `echo "no test"`. Every phase's "acceptance tests" and
"existing tests still pass" are currently vacuous. **Phase 0 adds a test runner**
(Vitest + Supertest for backend API; component smoke tests optional) so later acceptance
criteria are executable.

### B‑5 — Port authority
`backend/.env.example` sets `PORT=3000`; README says `:4000`. Per global rules, **all port
assignments go through the `ports` skill + `~/.claude/PORTS.md` lane** — do not hardcode.
Phase 9's `apps/admin-web` needs its own lane port. Resolve the backend port canonically in Phase 0.

### B‑6 — Schema PK convention
Existing tables use **`serial` integer PKs** (chat tables use `varchar(255)` UUID-style).
Global default is UUID, but **new tables must match existing `serial` + FK cascades** for
referential consistency. This plan uses `serial` PKs for new tables and notes the deliberate
divergence from the global UUID default.

---

## Cross-cutting workstreams (apply in every phase)

| Stream | Rule |
|---|---|
| Brand sweep | Every `Stillwater` literal → `ForUs`; recolor arc mark to ForUs palette. Grep gate in CI. |
| Money display | All monetary values via a `<Money minor={} currency={}/>` component (KES/UGX/TZS/RWF). No hardcoded `$`. |
| Data access | Raw SQL, `$1,$2` placeholders only. Services throw; controllers catch & shape. |
| Auth | Protected routes use `authenticate` middleware; role checks in controllers (until Phase 9 RBAC). |
| i18n | Scaffold `i18next` in **Phase 2** (not Phase 10). English strings externalized as added. |
| a11y | `accessibilityLabel` on every primitive from Phase 0. |
| Migrations | `schema.js` + reversible SQL migration via `migrations` skill. Never `drizzle-kit push` in prod. |
| Ports | Assign via `ports` skill only. |
| Deps to remove | `lottie-react-native`, `recharts`, `react-native-chart-kit` (charts → inline `react-native-svg`). |
| Deps to add | `react-native-agora`, `resend`, `expo-speech`, `axios` (Pesapal, no SDK), `i18next`/`react-i18next`. |

---

## Discovery gate (do FIRST, before Phases 2/5/6 code)
Per make-plan's "verify > assume": before writing any third-party integration, read the live docs
via **context7** and record exact signatures in a short "Allowed APIs" note. Do NOT invent methods.
- **Pesapal API v3** — confirm: `POST /api/Auth/RequestToken`, `POST /api/URLSetup/RegisterIPN`,
  `POST /api/Transactions/SubmitOrderRequest`, `GET /api/Transactions/GetTransactionStatus`,
  Disbursement endpoint, recurring/subscription fields, IPN payload + signature/IP allowlist.
- **Agora** — confirm `react-native-agora` `createAgoraRtcEngine()/initialize/joinChannel` surface
  and server-side token build (`RtcTokenBuilder`), plus Cloud Recording + Real-Time Transcription.
- **Resend** — confirm Node `resend.emails.send({from,to,subject,html})` and domain verification.
- **Merchant onboarding is the long pole** — start Pesapal sandbox→production application **on Day 1
  of Phase 0** (risk register: approval can take 1–2 weeks, longer cross-border).

---

# Phase 0 · Foundation & rebrand
**Blocked-by:** none (but B‑1 design files should be supplied first). **Est: 5–7 person-days.**

### Deliverables
- Consolidated design tokens in **`frontend/theme/`** (palette `ForUs.bg/blue/orange` + mood
  spectrum, Inter typography 400/500/600/700, spacing, radii), reconciled with the existing
  `frontend/src/constants/theme.tsx` 8-theme system (pick ForUs as default; keep others or retire).
- Tamagui token wiring in `frontend/tamagui.config.ts` (currently default config, no overrides).
- Primitives (RN + Tamagui): `<Btn variant>`, `<Field>`, `<Avatar>`, `<IconBtn>`, `<ProgressDots>`,
  `<ScreenShell>`, `<HeaderBar>`, `<TabBar>`, `<AppBar>`, `<Logo>` (arc mark), `<Money>`.
- Dev gallery route **`frontend/src/app/_dev/components.tsx`**.
- App-wide Inter font load (root `_layout.tsx`).
- **Brand sweep** `Stillwater`→`ForUs`; add CI grep gate.
- **Remove** `lottie-react-native`, `recharts`, `react-native-chart-kit`; add `react-native-svg` usage.
- **B‑4:** add Vitest + Supertest to `backend/`; wire `npm test`.
- **B‑5:** finalize backend port via `ports` skill; fix `.env.example`.

### Files (create/edit)
- create `frontend/theme/{tokens.ts,palette.ts,typography.ts,spacing.ts}`
- create `frontend/src/components/ui/{Btn,Field,Avatar,IconBtn,ProgressDots,ScreenShell,HeaderBar,TabBar,AppBar,Logo,Money}.tsx`
- create `frontend/src/app/_dev/components.tsx`
- edit `frontend/tamagui.config.ts`, `frontend/src/app/_layout.tsx`, `frontend/src/constants/theme.tsx`
- edit root + `frontend/package.json` (remove lottie/recharts/chart-kit)
- create `backend/vitest.config.js`, `backend/tests/smoke.test.js`; edit `backend/package.json`

### Schema diffs / Routes / SDK: none. ### Screens: primitives only ⟨design unresolved — B‑1⟩.
### Acceptance
- Dev gallery renders every primitive on iOS + Android, light mode, with `accessibilityLabel`.
- `grep -ri stillwater frontend/src` = 0 hits. `npm test` (backend) runs and passes smoke test.
### Risk (register): "Desktop admin diverges from tokens" — mitigated early by single token source in
`frontend/theme/` (becomes `packages/tokens/` in Phase 9). "Pesapal approval slow" — onboarding starts now.
### Rollback: pure additive + dep removal; revert the branch. No data/schema touched.

---

# Phase 1 · Schema migrations + service skeletons
**Blocked-by:** Phase 0. **Est: 4–6 person-days.**

### Deliverables
One reversible migration landing all schema changes; empty skeletons (no logic) for
`EmailService` (Resend), `PaymentService` (**Pesapal**, per B‑2), `VideoService` (**Agora**, per B‑2),
`ModerationService`.

### Schema diffs (add to `backend/db/schema.js` + SQL migration)
```
profiles     + pronouns text, + reminder_time time, + reminder_days smallint (day mask),
             + show_mood_publicly bool default false, + discoverable_in_groups bool default true
users        + plan text default 'free' check in ('free','plus_monthly','plus_annual'),
             + plan_expires_at timestamptz, + safety_plan_id int null FK→safety_plans
moods        + feeling_tags text[], + note text
consultant_details + consultant_type text default 'marketplace' check ('in_network','marketplace'),
             + session_rate_minor int null, + currency text, + momo_msisdn text,
             + intro_video_url text, + bio_long text
appointments + agora_channel_name text, + recording_url text   (folded here from Phase 6)
chat_rooms   + agora_channel_name text
NEW: user_goals, subscriptions, transactions, payouts, appointment_intakes, session_notes,
     post_session_reflections, safety_plans, voice_entries, moderation_flags, audit_log,
     content_reports        (columns per migration doc lines 98–109; serial PKs per B‑6)
password_reset_tokens — already exists; no schema change, wire handler in Phase 2.
community_posts/likes/comments — already exist; wire in Phase 4.
```
### Files
- edit `backend/db/schema.js`; create `backend/migrations/2026_____stillwater_core.sql` (+ down)
- create skeletons `backend/services/{EmailService,PaymentService,VideoService,ModerationService}.js`
### Routes / Screens / SDK: none (skeletons throw `NotImplemented`).
### Acceptance: migration applies cleanly + **reverses** cleanly on a scratch DB; existing routes
unaffected; `npm test` green. ⟨No design dependency.⟩
### Risk: "cross-currency settlement" — mitigated by `currency` + `_minor` columns now, single-currency-per-region enforced later.
### Rollback: run the down migration; delete skeleton files.

---

# Phase 2 · Onboarding redesign (12 screens) + real email
**Blocked-by:** Phases 0, 1. **Est: 7–9 person-days.**

### Screens (replace `frontend/src/app/(auth)/onBoarding.tsx` Lottie carousel) ⟨design unresolved — B‑1⟩
`ScreenWelcome, ScreenTourBreath, ScreenTourMood, ScreenTourPrivacy, ScreenTourNotify`
(→ real OS notification permission), `ScreenSignup` (Apple/Google placeholders), `ScreenVerify`
(6-digit, 60s resend), `ScreenName` (+pronouns), `ScreenMood` (writes `moods`), `ScreenGoals`
(writes `user_goals`), `ScreenReminder` (writes `profiles.reminder_time`+day mask), `ScreenAllSet`.
Reuse existing `OnboardingButton`, `ProgressDots`, `Field`.

### Routes (backend)
- `POST /api/auth/send-verification` — 6-digit code, hashed, 10-min TTL
- `POST /api/auth/verify-email` — validate → `users.emailVerified = true`
- `POST /api/onboarding/complete` — pronouns, goals[], reminder_time, days mask (one payload)
- Extend reminder cron (`backend/jobs/reminderJob.js`): every 5 min send daily reminder to users
  whose `reminder_time`≤now today on an enabled day, if not already sent.
### SDK: **Resend** `emails.send` (verify code, from a verified domain). i18next scaffold added here.
### Files: create screens under `(auth)/`; edit `authRoutes.js`, `AuthController.js`, `AuthServices.js`,
new `onboardingRoutes/Controller/Services`, `EmailService.js` (implement), `reminderJob.js`; remove Lottie assets (`welcome/therapist/connection.json`).
### Acceptance: new user completes onboarding end-to-end, receives real verification email, reminder fires at chosen time. `verify-email` flips `emailVerified`.
### Risk: email deliverability — mitigate with verified Resend domain + retry; fall back to SES if volume grows.
### Rollback: feature-flag new onboarding; revert route to old `onBoarding.tsx`; email endpoints are additive.

---

# Phase 3 · User app core (10+ screens) + stats
**Blocked-by:** Phases 0, 1 (2 recommended). **Est: 10–12 person-days.**

### Screens ⟨design unresolved — B‑1⟩ (replace, don't delete — keep old routes during transition)
`ScreenHome` (events+activities+today's pick), `ScreenCheckIn` (color+feeling_tags+note →
writes all three to `moods`), `ScreenLibrary` (replaces `ResourceViewer`/`ArticlesScreen`/
`BooksScreen`/`MusicScreen`/`PodcastsScreen`/`RoutinesScreen` with category chips),
`ScreenPlayer` (replaces `AudioScreen` + reuses `WaveformVisualizer`/`AudioProgressBar`/
`SpeedControl`), `ScreenSearch`, `ScreenProfile` (streak/sessions/hours + 30-day sparkline),
`ScreenSettings`, `ScreenNotifications` (Today/Yesterday/older), `ScreenChatsList` (replaces
`chat.tsx`), `ScreenDM`, `ScreenGroupChat` (keep Stream Chat plumbing, restyle).

### Routes (backend)
- `GET /api/profile/stats` → `{streak_days,total_sessions,total_practice_minutes,mood_trend_30d}`
- `GET /api/search?q=` → federated (resources + consultants + groups)
- Streak cron (daily) → updates `profiles.streak_days` from `moods` continuity.
### SDK: none new. ### Files: new screens under `(tabs)`/`(screens)`; new `statsRoutes/Controller/Services`, `searchRoutes/...`; new streak job in `backend/jobs/`.
### Acceptance: home renders live data; check-in writes color+tags+note; stats endpoint returns correct streak; search federates 3 sources.
### Risk: scope creep (10+ screens) — hard cutoff; ship subset behind flag if over.
### Rollback: old tab routes remain; flip flag back.

---

# Phase 4 · Community / peer feed
**Blocked-by:** Phases 0, 1, 3. **Est: 5–6 person-days.**

### Activate dormant `community_posts/likes/comments` tables (currently no API; frontend uses
`frontend/src/data/feed-data.ts` mock via `CommunityFeedContent.tsx`).
### Routes: `GET /api/feed` (paginated; filters following/all/group_id), `POST /api/feed/posts`,
`GET /api/feed/posts/:id`, `POST /api/feed/posts/:id/reactions` (support|same|hugs),
`POST /api/feed/posts/:id/comments`, `GET /api/groups`, `POST /api/groups/:id/join`.
### Screens ⟨design unresolved — B‑1⟩: `ScreenFeed, ScreenComposer, ScreenPostDetail, ScreenGroups`
(replace `feed-data.ts` mock with live API in `CommunityFeedContent.tsx`).
### Pseudonymous handles: generate `@adjective_noun_NN` on signup → `profiles.username` (already
unique); settings toggle to show/hide real name in community surfaces.
### Files: new `feedRoutes/Controller/Services`, `groupRoutes/...`; handle-generator util; edit signup to assign username; new screens; delete `feed-data.ts` usage.
### Acceptance: post/react/comment/join end-to-end; no real names shown when toggled off.
### Risk: moderation not yet live (Phase 7) — mitigate with a temporary length/rate limit + report button stub.
### Rollback: feature-flag feed tab off; tables retain data (soft delete).

---

# Phase 5 · Therapy booking + payments (Pesapal) — HIGHEST RISK
**Blocked-by:** Phases 0, 1 (Discovery gate: Pesapal sandbox live). **Est: 15–20 person-days.**

### Pesapal v3 headless mobile-money flow (custom UI, no iframe/redirect — doc lines 21–46)
Products `ForUs+ Annual` / `ForUs+ Monthly` (per-region KES/UGX/TZS/RWF). Marketplace one-time
session charges: `pending` until session `completed`, then release to consultant ledger minus 25%.
Payouts via **Pesapal Disbursement API** monthly.

### Backend routes
- `POST /api/billing/subscribe` → creates Pesapal order, returns `order_tracking_id`
- `GET /api/billing/status/:order_tracking_id` → poll (client polls every 2s, 90s timeout)
- `POST /api/billing/cancel` → set `cancel_at_period_end` (idempotent)
- `GET /api/billing/me` → plan + next charge + last 6mo transactions
- `POST /api/billing/charge-session` → marketplace order → `order_tracking_id`
- `POST /api/pesapal/ipn` → IPN webhook: verify against Pesapal IP allowlist, reconcile
  `transactions`+`subscriptions`, settle consultant ledger on appointment-linked completion
- Booking-enforcement middleware: `in_network` → require `users.plan != 'free'`; `marketplace` →
  require `succeeded` transaction for `appointment_id` before `pending`→`confirmed`.
### SDK: Pesapal via `axios` (RequestToken → RegisterIPN once at boot → SubmitOrderRequest →
GetTransactionStatus; Disbursement for payouts). **Confirm every field at Discovery gate.**
### Screens ⟨design unresolved — B‑1⟩: `ScreenTherapistFind` (replaces `consultantSearch.tsx`;
Included vs `KES 8,500 / 50 min`), `ScreenTherapistProfile` (intro video + long bio; replaces
`ConsultantDetailsScreen.tsx`), `ScreenBookingCalendar` (keep slot logic in `createAppointment.tsx`,
restyle), `ScreenBookingConfirmed`, `ScreenIntake` (→ `appointment_intakes`), `ScreenPaywall`,
`ScreenPayMobileMoney` (amount/phone → "Check your phone" branded polling spinner → success/fail;
**only carrier UI is the OS STK PIN prompt**).
### Admin: add `consultant_type`/`session_rate_minor`/`currency`/`momo_msisdn` editors to admin
consultant screen; read-only Billing tab (precursor to Phase 9).
### Acceptance: subscribe via MTN MoMo on a real phone → STK push fires → custom UI polls → success
→ `users.plan` flips; marketplace session pay → consultant ledger credited 75% after `completed`;
cancel mid-cycle sets next-period flag; IPN reconciles a dropped poll.
### Risk (register): STK timeout on bad networks → 90s timeout + retry + IPN backstop + show last-4 of
msisdn. Approval slow → onboarding started Phase 0; Flutterwave MoMo as documented backup interface.
### Rollback: kill-switch env flag disables billing routes; bookings fall back to free/manual;
`transactions` are append-only so no financial state is lost.

---

# Phase 6 · Video calling (Agora)
**Blocked-by:** Phases 0, 1, 5. **Est: 10–12 person-days.** *(Re-plan after Phase 5 — provisional.)*
### Screens ⟨design unresolved — B‑1⟩: `ScreenLobby` (mic/cam preview), `ScreenInCall` (1:1, PiP self,
captions, dock: mic/cam/chat/end), `ScreenGroupCall` (grid, raise hand, host mute/remove).
### Backend: `POST /api/video/token` (Agora RTC token scoped to uid+channel+role, 1h TTL, reissue on
refresh); extend `POST /api/appointments/:id/start-session` to set
`agora_channel_name = appt-{id}-{nanoid(6)}` and return token+channel; `POST /api/groups/:id/start-call`;
Cloud Recording opt-in → `appointments.recording_url` (encrypted at rest, participants only).
### SDK: `react-native-agora` (`createAgoraRtcEngine/initialize/joinChannel`); server token via
`RtcTokenBuilder`; captions via Agora Real-Time Transcription (fallback off-device Whisper v1).
### Permissions: `RECORD_AUDIO`,`CAMERA` at first call (not install); iOS `NSMicrophone/NSCameraUsageDescription`.
### Acceptance: two users on different networks join, A/V + captions work, leaving sets
`appointments.status='completed'`, p50 latency <250ms Nairobi↔Kampala.
### Risk (register): latency in target markets → **run the 10-user Agora pilot (Kampala/Nairobi/Lagos/
Kigali) during Phase 0**, before committing here.
### Rollback: feature-flag video off → sessions revert to text chat; `agora_*` columns nullable.

---

# Phase 7 · Crisis & safety
**Blocked-by:** Phases 0, 1 (moderation scan pairs with chat send). **Est: 5–6 person-days.**
### Screens ⟨design unresolved — B‑1⟩: `ScreenCrisis` (SOS, reachable everywhere via long-press of the
orange brand mark), `ScreenCrisisFollowup` (next-day therapist check-in, free unbilled session offer).
### Detection: `ModerationService.scan(message)` on every chat send (keyword+regex passive-ideation now;
ML later behind same interface). On hit → crisis card to sender, peer-supporter banner to receiver,
escalate flag to admin queue (`moderation_flags`).
### Backend: `POST /api/safety-plans`, `GET /api/safety-plans/me`; cron 24h after flag →
`EmailService.sendCrisisFollowup` to assigned consultant. Hotlines hardcoded per region
(988 US, Samaritans UK, Befrienders WW), geolocated from `profiles.country`
(**note:** `profiles` has no `country` column today — add in Phase 1 amendment or here).
### Acceptance: flagged phrase in DM triggers all three surfaces within 1s.
### Risk (register): false positives flood queue → tunable `model_score` threshold + human triage on P0.
### Rollback: scan is additive; disable via flag; safety-plan routes independent.

---

# Phase 8 · Therapist tools + tablet
**Blocked-by:** Phases 0, 1, 5. **Est: 10–12 person-days.**
### Phone screens ⟨design unresolved — B‑1⟩: `ScreenTNotes` (SOAP editor, auto-save, share-with-client
toggle → `session_notes`), Earnings tab (replaces stub `(consultants)/index.tsx` region: monthly bar
chart via inline SVG, recent sessions, pending payout).
### Tablet: `ScreenTToday, ScreenTSchedule (week grid), ScreenTClients, ScreenTClientDetail` —
responsive in the SAME Expo app via `useWindowDimensions` breakpoints (>~900pt unlocks dense layout).
### Backend: `GET/POST /api/consultant/notes/:appointment_id`,
`GET /api/consultant/earnings?period=month|year` (currency-aware, settled vs pending),
`GET /api/consultant/clients`, `GET /api/consultant/clients/:user_id/mood-trend?days=30`.
### Acceptance: SOAP note write+share; earnings reconcile against Pesapal disbursements; iPad landscape
shows week grid, portrait falls back to phone layout.
### Risk: earnings must match real disbursements — reconcile against `payouts`/`transactions`, not estimates.
### Rollback: consultant tools flag; tablet layout degrades gracefully to phone layout.

---

# Phase 9 · Admin — desktop web (Next.js) + slim Expo admin + RBAC + monorepo
**Blocked-by:** Phases 0, 1, 5 (billing data), 7 (moderation). **Est: 18–22 person-days.**
### Monorepo restructure (introduced here):
```
apps/mobile/ (was frontend/)   apps/admin-web/ (new Next.js 14)   backend/
packages/tokens/ (from frontend/theme/)   packages/api-client/ (shared TS types + fetch)
```
### Desktop web `apps/admin-web/` (Next.js 14 App Router, TS, Tailwind, **shared `packages/tokens/`**),
domain `admin.forus.app` (own deploy + **port via `ports` skill**, B‑5). Screens ⟨design unresolved —
B‑1⟩: `ScreenAOverview, ScreenAModeration, ScreenAChatSessions, ScreenAChatDetail, ScreenAVerify,
ScreenAUsers, ScreenAGroups, ScreenAContent, ScreenABilling, ScreenAAnalytics, ScreenATeam, ScreenAAudit`.
### Slim Expo admin (`(admin)/`): Overview KPIs, Moderation queue, Chat detail, Therapist verification;
heavier screens link out via `Linking.openURL`.
### Backend: activate commented `adminRoutes.js`; add `/api/admin/moderation|audit|billing|
analytics/cohorts|team`; extend CORS allowlist to admin origin; **RBAC**: replace flat `users.role`
with `role_id`→`roles`→`role_permissions` (`moderation.read/write`, `verification.write`,
`billing.read`, `audit.read`, `team.write`); **audit-log middleware** writes every admin write to
`audit_log` (actor, action, target, IP, request id).
### Acceptance: T&S admin resolves a flag end-to-end from web AND phone without DB access; non-admin
login to `admin.forus.app` rejected; CI fails if a token CSS var appears outside `packages/tokens/`.
### Risk (register): admin diverges from mobile tokens → single `packages/tokens/` source + CI gate.
### Rollback: monorepo move is the risky bit — do it on a branch with path shims; RBAC ships behind a
flag that falls back to the flat `role` check; audit middleware is additive.

---

# Phase 10 · Voice journal & polish
**Blocked-by:** Phases 0, 1, 3. **Est: 5–6 person-days.** *(Optional — punt if running long.)*
### Screen ⟨design unresolved — B‑1⟩: `ScreenVoiceJournal` (record → on-device transcribe via
`expo-speech` → save to `voice_entries`; reuse existing `VoiceRecorder.tsx`).
### Backend: `POST /api/voice-entries` (multipart audio → MinIO/S3 via existing `StorageService`, attach transcript).
### Acceptance: record → transcribe → row in `voice_entries` with audio URL + transcript.
### Risk: on-device transcription accuracy — acceptable for v1; server Whisper fallback documented.
### Rollback: feature-flag; endpoint additive.

---

# Final verification phase (after 0–10)
- Grep gates: `stillwater` = 0; hardcoded `$`/`8000`/`8001` = 0; token vars only in `packages/tokens/`.
- All migrations reverse cleanly on a scratch DB.
- Backend test suite (Vitest+Supertest) green; each phase's acceptance test automated where feasible.
- Anti-pattern audit: no invented Pesapal/Agora/Resend methods (diff against Discovery-gate "Allowed APIs" note).
- Update `docs/STILLWATER_MIGRATION.md` marking phases complete as each ships.

## Effort roll-up (provisional): ~95–125 person-days ≈ 19–25 weeks solo (doc estimates 16–20; the delta
is the test harness, monorepo move, and design-file blocker). **Re-plan phases 6–10 as 0–5 land.**
