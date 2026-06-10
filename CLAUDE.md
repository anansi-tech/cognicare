# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Next.js 15 + Turbopack dev server
npm run build      # Production build
npm run lint       # ESLint (next lint)
npm test           # Vitest (run once)
npm run test:watch # Vitest (watch mode)
```

Tests: Vitest, `npm test`. Cover clinical scoring (PHQ-9/GAD-7 bands + safety flags), age helpers, billing status, recurrence date math, and practice scoping. Run before any PHI-touching change.

## Architecture

**Stack**: Next.js 15 App Router · React 18 · MongoDB (Mongoose) · NextAuth v5 (JWT) · OpenAI (`ai` SDK v5) · Stripe · Google Cloud Storage · Resend · Tailwind CSS v4 · shadcn/ui

**Deployed on Vercel** with a daily cron at `/api/cron/appointment-reminders`.

### Multi-Tenancy

Every document in every collection is scoped by `practiceId`. A practice is automatically created when a user signs up; solo practitioners are a practice of one. Never query without a `practiceId` filter unless building admin tooling.

Role hierarchy: `admin` (practice owner) > `counselor`. The session JWT carries `practiceId`, `role`, `isPracticeOwner`, and `stripeSubscriptionStatus` — use these instead of a separate DB lookup where possible.

### Auth

- **Edge-safe config**: `src/auth.config.js` — no Mongoose, used by middleware
- **Full config**: `src/auth.js` — credentials provider, JWT enrichment, audit events
- **Middleware**: `src/middleware.js` — protects all routes except public ones
- Login page: `/login`; signup creates a practice automatically

### Route Layout Groups

```
src/app/
  (auth)/       — login, signup (unauthenticated)
  (dashboard)/  — protected app shell
  api/          — API routes (all require session checks internally)
  pages/        — feature pages rendered inside dashboard layout
```

### Data Models (`src/models/`)

| Model | Role |
|---|---|
| `User` | Clinician/admin; belongs to one Practice |
| `Practice` | Tenant root; owns Stripe subscription + seats |
| `Client` | Patient record scoped to Practice + counselor |
| `Session` | Therapy session; links Client ↔ User |
| `AIReport` | Single AI agent output per session |
| `Report` | Clinician-compiled report assembled from AIReports |
| `Invoice` | Client billing; may have Stripe payment link |
| `AuditLog` | HIPAA compliance trail — log all PHI access |
| `ConsentForm` | Token-based e-signature request |
| `Invitation` | Practice team invite (token + expiry) |
| `LiamThread` | Rolling copilot conversation memory per (user, client) |
| `MeasureAdministration` | Scored clinical instrument (PHQ-9, etc.) |

### AI Agent System (`src/lib/ai/`)

Six specialized agents run after sessions: `assessment`, `diagnostic`, `treatment`, `progress`, `documentation`, `report`. Each stores its output as an `AIReport` document. Orchestration lives in `src/lib/ai/orchestrator.js`; individual agent configs in `src/lib/ai/agents/`. Prompt templates are in `prompts/`.

**Liam** (`src/lib/ai/liam/`) is a separate in-session copilot with per-thread rolling memory stored in `LiamThread`.

### Utility Patterns

- **MongoDB connection**: `src/lib/mongodb.js` — cached global singleton, always import this, never instantiate directly.
- **Audit logging**: `src/lib/audit.js` — call `logAudit()` for any PHI read/write. The `AuditLog` model enforces a closed enum for `action` and `entityType`; check those before adding new values.
- **PDF generation**: `src/lib/consent-pdf.js` and `src/lib/report-pdf.js` use `pdf-lib`.
- **File storage**: `src/lib/storage.js` wraps Google Cloud Storage — no local disk writes for documents.
- **Measurement-based care**: `src/lib/mbc/` handles instrument definitions, scoring, and trend analysis.
- **Plans/pricing**: `src/config/plans.js` is the source of truth for subscription tier limits.

### Key Environment Variables

```
MONGODB_URI
NEXTAUTH_URL
NEXTAUTH_SECRET
OPENAI_API_KEY
GOOGLE_CLOUD_PROJECT_ID
GOOGLE_CLOUD_CLIENT_EMAIL
GOOGLE_CLOUD_PRIVATE_KEY
GOOGLE_CLOUD_BUCKET_NAME
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
```

### PHI Handling

This is a HIPAA-aligned healthcare product. All client/session data is PHI. Every API route that reads or writes PHI must call `logAudit()`. The repo is private and must never become public.
