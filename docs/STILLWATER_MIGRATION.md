# Stillwater Migration Plan

**Goal:** Adopt the full Stillwater design system and feature set into ForUs1 — every screen, modal, flow, and supporting backend.

**Realistic timeline:** 16–20 weeks for one developer working full-time. Ship in phases; do not attempt as a single branch.

**Status:** Planning. No phases started.

---

## Decisions — LOCKED 2026-04-27

| Decision | Choice | Notes |
|---|---|---|
| **Brand name** | `ForUs` | All Stillwater wordmarks/logos in design files become `ForUs` strings + the still-water arc mark recolored to ForUs palette |
| **Payment gateway** | **Pesapal API v3** (mobile money: MTN, Airtel, M-Pesa) with **fully custom UI** — no iframe | See "Payment integration approach" below for the headless flow |
| **Video provider** | **Agora** (RTC SDK for React Native) | Lowest measured latency in African markets; SD-RTN routing handles flaky mobile networks; mature RN SDK |
| **Email provider** | **Resend** | Best DX, 3k/mo free, $20/mo for 50k. Migrate to AWS SES if volume exceeds ~100k/mo |
| **Tablet + desktop admin** | **Yes** — Expo (phone + tablet via responsive layouts) + separate Next.js desktop admin app | Adds ~4–6 weeks across phases 8 and 9 |

## Payment integration approach (Pesapal headless mobile money)

The Stillwater designs assume Stripe-style card flows. We're using mobile money via Pesapal, which behaves differently. Here is the contract every payment screen must follow so UI uniformity is preserved.

**What the user sees in our UI (custom, branded):**

1. Amount + phone number input
2. "Pay with MTN / Airtel / M-Pesa" selector (segmented control, our colors)
3. "Confirm" button → screen transitions to a "Check your phone" state with a polling spinner and the masked phone number
4. Success or failure state — both fully styled to ForUs

**What is OUTSIDE our UI (and cannot be customized — by anyone):**

- The carrier's SIM Toolkit (STK) PIN prompt that appears on the user's phone OS-level. This comes from the SIM card itself, not Pesapal, not us. No SDK on earth can re-skin this. Documented expectation.

**API flow:**

1. `POST /api/Auth/RequestToken` (Pesapal) → bearer
2. `POST /api/URLSetup/RegisterIPN` once at app boot, store `ipn_id`
3. On confirm: `POST /api/Transactions/SubmitOrderRequest` with `{ amount, currency, billing_address.phone_number, notification_id: ipn_id }` — this triggers the STK push to the user's phone
4. UI polls `GET /api/Transactions/GetTransactionStatus?orderTrackingId=…` every 2s until status is `COMPLETED` or `FAILED` (timeout at 90s)
5. Pesapal also calls our IPN webhook server-side as a backstop — both paths reconcile to the same `transactions` row

**Subscriptions** — Pesapal supports recurring; we'll use it for `Stillwater+ Annual` and `Monthly`. First charge is the same STK flow above; subsequent charges are auto-debited.

**Therapist payouts** — Pesapal Disbursement API can pay out to mobile money wallets; the marketplace 25% platform fee is computed and held server-side, paid out monthly via the disbursement endpoint.

---

## Phase 0 · Foundation & rebrand (1 week)

**Goal:** Lock decisions, install design tokens, ship the new visual language behind a feature flag.

**Deliverables**
- Decisions table above filled in and committed to this doc
- Design tokens in `frontend/theme/` — palette (`SW.bg`, `SW.blue`, `SW.orange`, mood spectrum), typography (Inter), spacing, radii
- Reusable primitives ported from Stillwater design files to React Native + Tamagui:
  - `<Btn variant>`, `<Field>`, `<Avatar>`, `<IconBtn>`, `<ProgressDots>`, `<ScreenShell>`, `<HeaderBar>`, `<TabBar>`, `<AppBar>`
- Logo component (the still-water arc mark)
- Storybook or screen-gallery route at `app/_dev/components.tsx` so you can review primitives in isolation
- App-wide font load (Inter weights 400/500/600/700)

**Out of scope:** Building any actual screens.

**Acceptance:** Open the dev gallery on iOS + Android, every primitive renders correctly in light mode.

---

## Phase 1 · Schema migrations (3–5 days)

**Goal:** Land every schema change the rest of the migration needs in one PR. Cheap to do up-front; expensive if drip-fed.

**Drizzle migrations to add**

```
profiles
  + pronouns text                          -- onboarding name screen
  + reminder_time time                     -- daily reminder picker
  + show_mood_publicly boolean default false
  + discoverable_in_groups boolean default true

users
  + plan text default 'free' check (plan in ('free','plus_monthly','plus_annual'))
  + plan_expires_at timestamptz
  + safety_plan_id int                     -- nullable FK

moods
  + feeling_tags text[]                    -- ["tired","worried","calm"]
  + note text

consultant_details
  + consultant_type text default 'marketplace' check (consultant_type in ('in_network','marketplace'))
  + session_rate_cents int                 -- null for in_network
  + intro_video_url text
  + bio_long text

new tables:
  user_goals (id, user_id, label, selected_at)
  subscriptions (id, user_id, plan, pesapal_order_tracking_id, pesapal_subscription_id, started_at, current_period_end, cancel_at_period_end, payment_method, momo_msisdn)
  transactions (id, user_id, appointment_id?, amount_minor, currency, kind, payment_method, momo_msisdn, pesapal_order_tracking_id, pesapal_confirmation_code, status, created_at, completed_at)
  payouts (id, consultant_id, amount_minor, currency, period_start, period_end, status, momo_msisdn, pesapal_disbursement_id)
  appointment_intakes (id, appointment_id, focus_text, current_mood, submitted_at)
  session_notes (id, appointment_id, consultant_id, soap_subjective, soap_objective, soap_assessment, soap_plan, homework, shared_with_client, created_at, updated_at)
  post_session_reflections (id, appointment_id, user_id, mood, takeaway_text, created_at)
  safety_plans (id, user_id, items jsonb, last_edited_at)
  voice_entries (id, user_id, audio_url, transcript_text, duration_seconds, created_at)
  moderation_flags (id, target_type, target_id, severity, reason, model_score, auto_detected, reporter_id?, status, resolved_by?, resolved_at, created_at)
  audit_log (id, actor_id, actor_kind, action, target_type, target_id, metadata jsonb, ip, created_at)
  content_reports (id, reporter_id, target_type, target_id, reason, status, created_at)
  password_reset_tokens (already exists — wire up handler)
```

**New backend services needed** (skeletons only in this phase, logic comes later)
- `EmailService` (Resend) — `sendVerification(email, code)`, `sendPasswordReset(email, link)`, `sendCrisisFollowup(...)`
- `PaymentService` (Stripe) — `createSubscription`, `createPaymentIntent`, `handleWebhook`
- `VideoService` (Stream Video) — `createCall`, `generateToken`
- `ModerationService` — keyword/regex passive-ideation detector, queue dispatch

**Acceptance:** `npm run migrate` applies cleanly, all existing tests still pass, no route changes yet.

---

## Phase 2 · Onboarding redesign (1–1.5 weeks)

**Goal:** Replace the current `onBoarding.tsx` Lottie carousel with the full Stillwater 8-step flow.

**Screens (in order)**
1. Welcome (`ScreenWelcome`)
2. Tour · Breathe (`ScreenTourBreath`)
3. Tour · Track (`ScreenTourMood`)
4. Tour · Privacy (`ScreenTourPrivacy`)
5. Tour · Notify (`ScreenTourNotify`) — triggers real OS notification permission
6. Sign up (`ScreenSignup`) — email + password + Apple/Google placeholders
7. Verify email (`ScreenVerify`) — 6-digit code via Resend, 60s resend cooldown
8. Name + pronouns (`ScreenName`)
9. Mood check (`ScreenMood`) — writes first row to `moods`
10. Goals (`ScreenGoals`) — multi-select, writes to `user_goals`
11. Reminder (`ScreenReminder`) — writes `profiles.reminder_time` + day mask
12. All set (`ScreenAllSet`)

**Backend**
- `POST /api/auth/send-verification` — issue 6-digit code, store hashed, 10min TTL
- `POST /api/auth/verify-email` — validate code, set `users.email_verified = true`
- `POST /api/onboarding/complete` — accepts pronouns, goals[], reminder_time, days mask in one payload
- Reminder cron job: every 5 min, for each user where `now() >= reminder_time` today and on enabled day, send push if not already sent

**Acceptance:** New user can complete onboarding end-to-end and receives a real verification email. Daily reminder fires at the chosen time.

---

## Phase 3 · User app core (2 weeks)

**Goal:** Replace the existing user tabs with Stillwater's user-app surface.

**Screens to build**
- `ScreenHome` — wires to `events`, `activities`, today's session pick from `resources`
- `ScreenCheckIn` — extended mood entry (color + feeling tags + note); writes all three
- `ScreenLibrary` — replaces `resourceScreen.tsx`, uses category chips
- `ScreenPlayer` — audio/video playback with progress bar; replaces `AudioScreen.tsx` etc
- `ScreenSearch` — global search across resources + consultants + groups
- `ScreenProfile` — stats (streak, sessions, hours), 30-day mood sparkline
- `ScreenSettings` — sectioned, includes new pseudonym + 2FA + crisis resources
- `ScreenNotifications` — grouped by Today / Yesterday / older
- `ScreenChatsList` — replaces `chat.tsx`, includes therapist row + groups + DMs
- `ScreenDM`, `ScreenGroupChat` — keep existing Stream Chat plumbing, restyle

**Backend**
- `GET /api/profile/stats` — { streak_days, total_sessions, total_practice_minutes, mood_trend_30d }
- `GET /api/search?q=` — federated search (resources + consultants + groups)
- Streak computation cron — daily job updates `profiles.streak_days` based on `moods` continuity

**Replace, don't delete** the existing screens — symlink old routes to new ones during the transition.

---

## Phase 4 · Community / peer feed (1 week)

**Goal:** Activate the dormant `community_*` tables.

**New routes**
- `GET /api/feed` — paginated, with filters (following, all, group_id)
- `POST /api/feed/posts`
- `GET /api/feed/posts/:id`
- `POST /api/feed/posts/:id/reactions` (`support`, `same`, `hugs`)
- `POST /api/feed/posts/:id/comments`
- `GET /api/groups` — discover
- `POST /api/groups/:id/join`

**Screens**
- `ScreenFeed`, `ScreenComposer`, `ScreenPostDetail`, `ScreenGroups`

**Pseudonymous handles** — generate `@adjective_noun_NN` on signup, store in `profiles.username`. Toggle in settings to show/hide real name within community surfaces.

**Acceptance:** Anyone can post, react, comment, and join groups end-to-end without seeing real names.

---

## Phase 5 · Therapy booking + payments (3–4 weeks)

**Goal:** Real money moves. Highest-risk phase — block time for Pesapal merchant onboarding (1–2 weeks for sandbox → production approval, longer if cross-border).

**Pesapal integration (mobile money, custom UI — see "Payment integration approach" at top of doc)**

- Pesapal API v3 sandbox keys → production keys
- Two products: `ForUs+ Annual` and `ForUs+ Monthly` (price in local currency: KES / UGX / TZS / RWF — set per-region)
- One-time charges for `marketplace` consultant sessions (status `pending` until session `completed`, released to consultant ledger minus 25% platform fee)
- Payouts to consultants via Pesapal Disbursement API on a monthly cycle (also mobile money; consultant `momo_msisdn` configured in profile)

**Screens (all use the headless STK push flow — no iframes, no redirects)**

- `ScreenTherapistFind` — replaces `consultantSearch.tsx`, shows `Included` vs locale-priced (`KES 8,500 / 50 min`) based on `consultant_type`
- `ScreenTherapistProfile` — adds intro video, long bio
- `ScreenBookingCalendar` — keep existing slot logic, restyle
- `ScreenBookingConfirmed` — dedicated success screen with intake checklist
- `ScreenIntake` — pre-session form, writes to `appointment_intakes`
- `ScreenPaywall` — plan selector with annual highlighted
- `ScreenPayMobileMoney` — shared payment surface used by paywall + per-session checkout. States: amount/phone entry → "Check your phone" polling spinner (custom branded) → success/failure. **No carrier or Pesapal UI shown anywhere except the OS-level STK PIN prompt the SIM puts up.**

**Backend**

- `POST /api/billing/subscribe` — creates Pesapal subscription order, returns `order_tracking_id`; client polls `/api/billing/status/:order_tracking_id`
- `POST /api/billing/cancel` — flags `cancel_at_period_end`, idempotent
- `POST /api/pesapal/ipn` — IPN webhook receiver (verifies request signature against Pesapal's IP allowlist), updates `transactions` + `subscriptions` tables, settles consultant ledger entries when an appointment-linked transaction completes
- `GET /api/billing/me` — current plan + next charge + last 6 months of transactions
- `POST /api/billing/charge-session` — for marketplace bookings: creates session-tagged Pesapal order, returns `order_tracking_id` for the same polling flow as subscriptions
- Booking enforcement middleware: if consultant is `in_network`, require `users.plan != 'free'`; if `marketplace`, require a `succeeded` transaction matching `appointment_id` before `status` can move from `pending` → `confirmed`

**Admin work in this phase**

- Add `consultant_type`, `session_rate_minor`, `currency`, `momo_msisdn` editors to admin consultant-detail screen
- Read-only Billing tab showing recent transactions + subscription mix (real precursor to Phase 9's full billing dashboard)

**Acceptance:** Subscribe via MTN MoMo on a real phone, see STK push fire on the SIM, see custom UI poll and resolve to success, see `users.plan` flip to `plus_monthly`. Book a marketplace session, pay per-session, see consultant ledger credited 75% of charge after session moves to `completed`. Cancel mid-cycle and confirm next-period flag.

---

## Phase 6 · Video calling (2 weeks)

**Goal:** Replace text-only chat with real 1:1 and group video for therapy sessions and group rooms.

**Stack:** Agora RTC SDK (`react-native-agora`). Chosen for lowest latency in African markets — sub-200ms in Lagos / Nairobi / Johannesburg via SD-RTN routing that handles flaky mobile networks. Captions via Agora Real-Time Transcription add-on (or fall back to off-device Whisper for v1).

**Schema additions (folded into Phase 1 if not already there)**

- `appointments.agora_channel_name`, `appointments.recording_url`
- `chat_rooms.agora_channel_name` for group video rooms

**Screens**

- `ScreenLobby` — pre-call mic/cam preview, joins Agora channel on "Join"
- `ScreenInCall` — 1:1 video, picture-in-picture self preview, captions, controls dock (mic, camera, chat, end)
- `ScreenGroupCall` — grid layout, raise hand, host controls (mute participant, remove)

**Backend**

- `POST /api/video/token` — issues Agora RTC token scoped to `(uid, channel_name, role)` with 1-hour TTL; reissues on refresh
- `POST /api/appointments/:id/start-session` — already exists; extend to generate `agora_channel_name = appt-{id}-{nanoid(6)}` and return a token + channel
- `POST /api/groups/:id/start-call` — group video, creates ephemeral channel, broadcasts notification to room members
- Cloud recording (Agora Cloud Recording) — opt-in per appointment, off by default; if on, store the resulting MP4 URL on `appointments.recording_url`. Recordings are encrypted at rest and visible only to participants

**Permissions**

- `RECORD_AUDIO`, `CAMERA` requested at first call attempt, not at install
- iOS: `NSMicrophoneUsageDescription`, `NSCameraUsageDescription` in `Info.plist`

**Acceptance:** Two test users on different networks (one wifi, one mobile data) can join a session, video + audio works, captions render, leaving the call updates `appointments.status = 'completed'`. Latency measured under 250ms p50 on a Nairobi → Kampala test pair.

---

## Phase 7 · Crisis & safety (1 week)

**Goal:** Mental health app without a crisis flow is malpractice. Do this even if you skip everything else in this list.

**Screens**
- `ScreenCrisis` — Crisis SOS, reachable from every screen via long-press of the orange brand mark
- `ScreenCrisisFollowup` — next-day check-in from therapist, free unbilled session offer

**Detection**
- Run `ModerationService.scan(message)` on every chat send. Keyword + regex for now (e.g. passive-ideation patterns); future ML model lives behind same interface
- On hit: surface crisis card to sender, peer-supporter banner to receiver, escalate flag to admin queue

**Backend**
- `POST /api/safety-plans` — user creates/updates their plan
- `GET /api/safety-plans/me`
- Cron: 24h after a crisis flag, send `EmailService.sendCrisisFollowup` to user's assigned consultant

**Hotlines** — hardcode region-specific numbers (988 US, Samaritans UK, Befrienders Worldwide). Geolocate from `profiles.country`.

**Acceptance:** Sending a flagged phrase in DM triggers all three UI surfaces (sender, receiver, admin queue) within 1 second.

---

## Phase 8 · Therapist tools (2 weeks)

**Goal:** Bring consultant side up to Stillwater's standard.

**Phone (always built)**
- `ScreenTNotes` — SOAP note editor, auto-save, share-with-client toggle
- Earnings tab — replaces stub: monthly bar chart, recent sessions, pending payout

**Tablet (in-scope per locked decision)**
- `ScreenTToday`, `ScreenTSchedule` (week grid), `ScreenTClients`, `ScreenTClientDetail`
- Responsive layout in the same Expo app using `useWindowDimensions` + breakpoints — no separate build, no separate codebase
- Phone consultant app continues to work; tablet just unlocks denser layouts above ~900pt width

**Backend**
- `GET /api/consultant/notes/:appointment_id`, `POST` for create/update
- `GET /api/consultant/earnings?period=month|year` — currency-aware, settled vs pending split
- `GET /api/consultant/clients` — derived from distinct `appointments.user_id`
- `GET /api/consultant/clients/:user_id/mood-trend?days=30`

**Acceptance:** Consultant can write a SOAP note during/after a session, share a note with the client, see real earnings (in local currency) reconciled against Pesapal disbursement records. iPad in landscape shows the dense `ScreenTSchedule` week grid; same iPad in portrait falls back to the phone layout.

---

## Phase 9 · Admin upgrades — desktop web + Expo phone (4 weeks)

**Goal:** Replace stub admin with the full Stillwater super-admin surface. Per locked decision: build a **separate desktop web app** AND keep a slimmer admin inside the Expo app for on-the-go incident response. Both consume the same admin API.

**New: desktop admin web app at `apps/admin-web/`**

- Stack: Next.js 14 App Router · TypeScript · Tailwind · same design tokens as the Expo app (palette/typography ported via shared `packages/tokens/`)
- Auth: same JWT issuer as the mobile app; admin login page checks `users.role IN ('admin','super_admin')` plus the new RBAC permissions
- Domain: `admin.forus.app` (or chosen subdomain) — separate Vercel/Render deploy
- All 12 Stillwater admin screens live here at full desktop fidelity (1440 × 900 layouts)

**Slim admin inside the Expo app (existing `app/(admin)/`)**

- Reduced to just the on-call use cases: Overview KPIs, Moderation queue, Chat session detail, Therapist verification
- Anything heavier (cohort analytics, billing dashboards, team & roles editor) is desktop-only; the Expo screens link out to `admin.forus.app` via `Linking.openURL`

**Screens (desktop web — full set)**

- `ScreenAOverview` — KPIs, DAU sparkline, session mix, crisis queue
- `ScreenAModeration` — list + actions (Dismiss / Warn / Crisis flow)
- `ScreenAChatSessions` + `ScreenAChatDetail` — review flagged threads, take action
- `ScreenAVerify` — therapist verification with automated checks
- `ScreenAUsers` — already partly built, add state + flags + filters
- `ScreenAGroups`, `ScreenAContent`, `ScreenABilling`, `ScreenAAnalytics`, `ScreenATeam`, `ScreenAAudit`

**Backend**

- Activate the commented-out admin routes
- New admin routes: `/api/admin/moderation`, `/api/admin/audit`, `/api/admin/billing`, `/api/admin/analytics/cohorts`, `/api/admin/team`
- CORS allowlist on backend extended to include the desktop admin origin
- RBAC system: replace flat `users.role` enum with `users.role_id` → `roles` table → `role_permissions` table. Permissions: `moderation.read/write`, `verification.write`, `billing.read`, `audit.read`, `team.write`, etc
- Audit-log middleware: every admin write logs to `audit_log` with `actor_id`, action, target, IP, request id

**Monorepo shape (introduced this phase)**

```text
apps/
  mobile/          (existing Expo app — was 'frontend/')
  admin-web/       (new Next.js admin)
backend/           (existing Express API)
packages/
  tokens/          (shared design tokens — palette, typography, spacing)
  api-client/      (shared TypeScript types + fetch wrappers)
```

**Acceptance:** A Trust & Safety admin can resolve a flag end-to-end without touching the database — from either the desktop web app or the phone admin tab. Logging in to `admin.forus.app` with a non-admin account is rejected.

---

## Phase 10 · Voice journal & polish (1 week)

**Goal:** Last Stillwater feature. Optional — punt if running long.

**Screens**
- `ScreenVoiceJournal` — record, on-device transcribe via Expo Speech / `expo-speech`, save to `voice_entries`

**Backend**
- `POST /api/voice-entries` — accepts audio file (multipart), stores in MinIO/S3, attaches transcript

---

## Cross-cutting work

- **Brand strings** — every `Stillwater` literal in the design files becomes `ForUs`. Sweep on Phase 0 entry
- **Lottie/asset replacement** — current onboarding uses `welcome.json`, `therapist.json`, `connection.json`. New design is pure CSS/SVG; remove Lottie dependency
- **Drop unused dependencies** — `recharts` (admin charts move to inline SVG)
- **Add deps** — `react-native-agora`, `resend`, `expo-speech`, `react-native-svg`, `@react-native-async-storage/async-storage` (already in), Pesapal calls go through `axios` (no SDK)
- **i18n prep** — designs are English-only. East Africa rollout means Swahili + Luganda + Kinyarwanda are likely v1.1 needs; scaffold `i18next` in Phase 2 not Phase 10
- **Currency + locale** — every monetary display goes through a `<Money minor={...} currency={...}/>` component fed by `users.currency` (KES/UGX/TZS/RWF). No hard-coded `$` in the codebase
- **Accessibility** — designs assume sighted users; add `accessibilityLabel` to every primitive in Phase 0

---

## Risk register

| Risk | Mitigation |
|---|---|
| Pesapal sandbox → production approval slow for mental health | Start merchant onboarding Day 1 of Phase 0; have Flutterwave Mobile Money as backup. Test in sandbox throughout phases 1–4 so production approval isn't blocking |
| Mobile money STK push timing out on bad networks | 90s polling timeout in UI, retry button, IPN webhook as server-side reconciliation backstop. Show last-4 of `momo_msisdn` so user knows what number to check |
| Cross-currency settlement (consultant in UG, user in KE) | Phase 5 launches single-currency-per-region; cross-border deferred to v1.1 |
| In-network therapist recruitment fails | Launch with marketplace-only; add `Included` tier in v1.1 |
| Video calling latency in target markets | Run an Agora pilot with 10 real users in different cities (Kampala, Nairobi, Lagos, Kigali) during Phase 0, before Phase 6 commits |
| Moderation false positives flood crisis queue | Tune model_score threshold during a closed beta; require human triage on every P0 |
| Desktop admin app diverges from mobile design tokens | Single source of truth in `packages/tokens/` consumed by both apps; CI fails if a token-named CSS variable appears outside that package |
| Scope creep across 18+ weeks | Each phase has a hard cutoff; if blowing through, ship phase as-is and reschedule remainder |

---

## Where to start

Decisions are locked. Run the full-migration starter prompt below to plan **every phase (0 through 10)** in one pass.

**Full-migration starter prompt for Claude Code CLI:**

```text
/make-plan Read docs/STILLWATER_MIGRATION.md end to end. Produce a
detailed implementation plan for EVERY phase, 0 through 10. Output a
single ordered plan, with each phase as its own top-level section
containing: deliverables, files to create/edit (with paths), schema
diffs, new and changed routes, screens with the design source they
map to, third-party SDK calls, acceptance tests, and explicit
dependencies on prior phases.

Honor the locked decisions in the migration doc:
  - Brand is ForUs. Every "Stillwater" string in the design source
    becomes "ForUs". Re-skin the still-water arc logo to the ForUs
    palette. No exceptions, including in admin chrome and tablet
    chrome.
  - Payments are Pesapal API v3 mobile money (MTN, Airtel, M-Pesa)
    with fully custom UI — no iframes, no redirects. The headless
    STK-push flow is documented in the "Payment integration approach"
    section of the migration doc; Phase 5's plan must use it. Subscriptions
    AND per-session marketplace charges both go through it. Therapist
    payouts use the Pesapal Disbursement API.
  - Video provider is Agora (react-native-agora). Phase 6 plans must
    include token-issuing backend, channel naming, captions strategy,
    and a measured pilot in Lagos / Nairobi / Kampala / Kigali.
  - Email provider is Resend. Phase 1 wires it up; Phase 2's verify-email
    and Phase 7's crisis-followup mail use it.
  - Surfaces: phone + tablet share the same Expo codebase via
    useWindowDimensions breakpoints. Desktop admin is a separate
    Next.js 14 app at apps/admin-web/ with shared design tokens in
    packages/tokens/. Monorepo restructure happens in Phase 9; until
    then, frontend/ is the Expo app and packages/tokens/ is referenced
    via a relative import or workspace symlink.

Inventory every primitive and screen referenced across these design
files, and map each to its implementation target:
  screens.jsx, user-app.jsx, therapy-flow.jsx, admin.jsx,
  therapist-dashboard.jsx, ios-frame.jsx, android-frame.jsx,
  browser-window.jsx, design-canvas.jsx (canvas is reference only,
  do not port).

Per-phase requirements:
  - Phase 0: design tokens, all primitives, component gallery at
    /_dev/components, asset/Lottie cleanup, branding sweep
  - Phase 1: every schema migration in one Drizzle migration file;
    skeletons for EmailService, PaymentService (Pesapal),
    VideoService (Agora), ModerationService — no business logic yet
  - Phase 2: 12 onboarding screens, real Resend verify-email, daily
    reminder cron extension
  - Phase 3: 10+ user-app core screens, profile/stats endpoints,
    streak cron
  - Phase 4: feed/composer/groups CRUD, pseudonymous handle generator
  - Phase 5: full Pesapal integration, paywall, marketplace booking,
    consultant ledger, IPN webhook, /api/billing/* surface
  - Phase 6: Agora token issuer, lobby/in-call/group-call screens,
    Cloud Recording opt-in
  - Phase 7: crisis SOS, safety plans, ModerationService scan on
    every chat send, hotlines by region
  - Phase 8: SOAP notes, earnings dashboard, tablet layouts
  - Phase 9: separate apps/admin-web/ Next.js app, monorepo
    introduction, RBAC tables and middleware, audit-log middleware
  - Phase 10: voice journal with on-device transcription

For each phase also include:
  - A "blocked-by" line listing which prior phases must be complete
  - A rough effort estimate in person-days
  - The risk this phase carries from the doc's risk register, and
    how this plan mitigates it
  - A "rollback" line: how to revert if this phase ships broken

Acknowledge in the plan output that later phases (especially 6-10)
may need re-planning once earlier phases reveal real constraints —
do not pretend the plan is final.

Output the plan as nested subtasks I can review before /do executes
anything. Do not write code in this run. Do not commit anything.
```

After you review the plan and approve it:

```
/do
```

Per phase, repeat: edit `docs/STILLWATER_MIGRATION.md` to mark phase complete, then `/make-plan` for the next phase.
