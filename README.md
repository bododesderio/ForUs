# ForUs

A mental wellness platform — therapist consultations, daily mood check-ins, peer community, and a curated resource library.

## Status

Active development. The app is mid-migration to a new design system and feature set codenamed **Stillwater** — see [`docs/STILLWATER_MIGRATION.md`](docs/STILLWATER_MIGRATION.md) for the phased roadmap.

**Locked decisions (2026-04-27):**

- **Brand** — `ForUs` (Stillwater is the codename for the design source only)
- **Payments** — Pesapal API v3, mobile money (MTN, Airtel, M-Pesa) with **fully custom UI** — no iframes, no redirects. The only carrier UI the user ever sees is the OS-level STK PIN prompt on their SIM
- **Video** — Agora RTC SDK (lowest measured latency in African markets)
- **Email** — Resend (free tier covers dev; $20/mo for 50k)
- **Surfaces** — Expo for phone + tablet (responsive, single codebase) + a separate Next.js desktop admin at `admin.forus.app`

## Stack

**Mobile** — Expo 53 · React Native 0.79 · Expo Router · Tamagui · Stream Chat · Agora RTC (video, post Phase 6)
**Desktop admin** (post Phase 9) — Next.js 14 · TypeScript · Tailwind, sharing tokens with mobile via `packages/tokens/`
**Backend** — Express 5 · Drizzle ORM · PostgreSQL · Stream Chat · node-cron · Pesapal API v3 (post Phase 5) · Resend (post Phase 1)
**Infra** — Docker Compose (PostgreSQL + Redis + MinIO), Cloudinary for media, Expo push for notifications
**CI** — GitHub Actions (backend Docker build + frontend tsc), Trunk.io linting

## Quick start

Prereqs: Node 20+, Docker Desktop, an Expo account.

```bash
# Install
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Bring up Postgres + Redis + MinIO
docker compose up -d

# Apply migrations
cd backend && npm run migrate && cd ..

# Run backend + Expo together
node dev.js
```

`dev.js` boots the backend on `:4000` and the Expo dev server, watching both. Press `i` / `a` in the Expo CLI to launch a simulator.

## Project layout

```text
backend/
  controllers/    Route handlers
  services/       Business logic (PostgreSQL via Drizzle)
  db/schema.js    16 tables across auth, profiles, appointments, chat, mood, resources, events, community
  routes/         Express route registration
  middleware/     auth (JWT), rate limiters
  scripts/        Migration runner, seeds

frontend/
  app/            Expo Router file-based routes
    (auth)/       Login, signup, onboarding
    (tabs)/       User home, schedule, chat, profile
    (consultants)/  Therapist phone app — same shape, separate role
    (admin)/      Drawer-nav admin
    (screens)/    Modal/overlay screens (booking, resources, profile edit, chat rooms)
  components/     Shared UI
  context/        Auth + theme context

docs/
  STILLWATER_MIGRATION.md   The plan to upgrade the entire app to the Stillwater design + feature set
```

## What works today

- **Auth** — register, login, JWT (15min) + refresh (7d) tokens, push token registration
- **Appointments** — create, list, confirm/reject/cancel/reschedule, auto-cancel stale pending, post-appointment reviews, 5-min cron sends reminders 15min before start
- **Chat** — Stream Chat 1:1 and group rooms with typing indicators
- **Mood** — daily entry (1–10 scale, one per day), simple history
- **Resources** — 8 content types (book, article, music, audio, podcast, routine, video, image), browse + per-type screens
- **Events** — community events with statuses
- **Notifications** — Expo push, persisted, read tracking, per-user preferences
- **Activity log** — login / register / profile_update / appointment_create / event_create

## What doesn't yet — and is on the Stillwater roadmap

- **Payments / subscriptions** — zero implementation. Adopting **Pesapal mobile money** (MTN / Airtel / M-Pesa) with fully custom UI. Two-track therapist model: ForUs+ subscription (in-network therapists included) plus marketplace therapists who set their own per-session rate. See migration plan Phase 5
- **Email service** — `email_verified` column exists but is never set; no email provider wired. Phase 1 + Phase 2
- **Forgot password** — table exists, route is a stub. Phase 2
- **Video calling** — chat is text-only today. Phase 6 brings Agora RTC for 1:1 sessions and group rooms
- **Crisis SOS / safety plans / moderation** — none exist. Phase 7 + Phase 9
- **Peer feed** — `community_posts` / `community_likes` / `community_comments` tables exist but no API or UI; frontend uses mock data. Phase 4
- **Goals, habit streaks, voice journal, session notes, therapist earnings, audit log, billing dashboard, cohort analytics** — none exist. Phases 3, 8, 9, 10

## Adopting Stillwater — how to drive the migration

Decisions are locked. Plan every phase up front in one pass with the prompt below; then execute phase-by-phase, re-planning later phases only if earlier ones reveal new constraints.

```text
# 1. Plan all phases (0 through 10) in one run
/make-plan Read docs/STILLWATER_MIGRATION.md end to end. Produce a
detailed implementation plan for EVERY phase, 0 through 10. Output a
single ordered plan, with each phase as its own top-level section
containing: deliverables, files to create/edit (with paths), schema
diffs, new and changed routes, screens with the design source they
map to, third-party SDK calls, acceptance tests, and explicit
dependencies on prior phases.

Honor the locked decisions:
  - Brand is ForUs (every "Stillwater" string in the design source
    becomes "ForUs"; re-skin the arc logo to the ForUs palette).
  - Payments are Pesapal API v3 mobile money (MTN, Airtel, M-Pesa)
    with fully custom UI — no iframes, no redirects. Use the headless
    STK-push flow documented in the migration doc. Subscriptions AND
    per-session marketplace charges both flow through it. Payouts use
    the Pesapal Disbursement API.
  - Video is Agora (react-native-agora). Plan Phase 6's token issuer,
    channel naming, captions, and an in-region pilot.
  - Email is Resend.
  - Surfaces: Expo (phone + tablet, single codebase) plus a separate
    Next.js 14 admin web app at apps/admin-web/ introduced in Phase 9,
    with shared design tokens in packages/tokens/.

Inventory every primitive and screen across screens.jsx, user-app.jsx,
therapy-flow.jsx, admin.jsx, therapist-dashboard.jsx, ios-frame.jsx,
android-frame.jsx, browser-window.jsx (design-canvas.jsx is reference
only — do not port). Map each to its implementation target.

For each phase include: blocked-by line, person-day estimate, risk
from the doc's risk register + how this plan mitigates it, and a
rollback line. Acknowledge in the plan that later phases may need
re-planning once earlier ones land.

Output as nested subtasks I can review before /do executes anything.
Do not write code. Do not commit.

# 2. Review, then execute phase-by-phase
/do
```

After each phase ships: update [`docs/STILLWATER_MIGRATION.md`](docs/STILLWATER_MIGRATION.md) to mark it complete. If shipped reality diverged from the plan, re-run `/make-plan` scoped to the *next* phase only before continuing.

## Conventions

- **Database** — PostgreSQL via Drizzle. `$1, $2` placeholders only. No raw `?` placeholders (project was migrated off MySQL syntax in Apr 2026)
- **Auth** — every protected route uses the `auth` middleware. Role checks happen in controllers, not routes
- **Errors** — services throw, controllers catch and shape the response
- **Logs** — backend logs to stdout; structured logging is a Stillwater Phase 9 task

## License

TBD.
