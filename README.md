# CogniCare

**AI-powered clinical practice management for mental health therapists.**

CogniCare gives a therapist an AI clinical team: specialized agents handle assessment, diagnosis,
treatment planning, progress tracking, and documentation, with an in-session copilot (LIAM) that
answers from the client's own record. The clinician brings the observations and clinical judgment;
CogniCare handles the paperwork. Built for solo practitioners and group practices alike.

> **Status:** Functionally complete and in pre-launch hardening. HIPAA compliance is **in progress**
> (OpenAI API BAA + field-level PHI encryption pending) — see [Compliance](#compliance). Do **not**
> process real client PHI until that work lands.

---

## What it does

- **Your AI clinical team** — five specialized agents run automatically across the clinical workflow,
  plus LIAM as an in-session copilot.
- **Measurement-based care** — administer PHQ-9 / GAD-7, track scored trends over time, surface
  reliable-change and reassessment signals.
- **Self-driving workflows** — intake assessment, session prep, and post-session notes generate on
  their own when the relevant event happens (no buttons to push).
- **Practice & team** — solo or multi-clinician. Invite colleagues, assignment-based client
  confidentiality (a clinician sees only their own clients; the owner sees all), transfer cases
  between clinicians.
- **Scheduling** — recurring appointments, automatic client email reminders, no-show tracking.
- **Billing & consent** — invoices with Stripe payment links, e-signature consent forms (type-to-sign
  with a generated signed PDF).
- **Reports** — compile a date-ranged narrative clinical report and export it as a PDF.
- **Subscription billing** — Solo and per-seat Practice plans via Stripe, with a 14-day trial.
- **Audit trail** — every PHI access/change is logged for compliance.

## The AI agents

Five specialists run as a pipeline — each feeds the next — and store their output as `AIReport`
documents:

1. **Assessment** — structured intake & risk evaluation
2. **Diagnostic** — DSM-5-TR / ICD-10 differential with criteria
3. **Treatment** — evidence-based plan with measurable goals
4. **Progress** — measurement-based progress evaluation
5. **Documentation** — drafts SOAP notes the clinician reviews and approves

A sixth **report** agent synthesizes these into compiled narrative reports.

**LIAM** (Listening Intelligent Assistant for Mental health) is a separate in-session copilot with
per-(clinician, client) rolling memory — it answers questions grounded in that client's full record,
not a generic chatbot.

> All AI output is clinical decision *support*. The licensed clinician reviews and approves
> everything; nothing is final without their sign-off.

## Tech stack

- **Framework:** Next.js 15 (App Router, Turbopack) · React 18
- **Styling:** Tailwind CSS v4 · shadcn/ui
- **Database:** MongoDB (Mongoose)
- **Auth:** Auth.js v5 (NextAuth) — JWT sessions, credentials provider
- **AI:** OpenAI via the Vercel AI SDK v5
- **Payments:** Stripe (subscriptions + client payment links)
- **Email:** Resend
- **Storage:** Google Cloud Storage (signed consent/report PDFs)
- **Hosting:** Vercel (daily cron for appointment reminders)

## Architecture notes

**Multi-tenancy:** every record is scoped by `practiceId`. A practice is created automatically at
signup; a solo practitioner is a practice of one. Visibility is assignment-based — clinicians see
their own clients (`counselorId`), owners see the whole practice.

**Self-driving agents:** the UI fires workflows on events (new client → intake; open scheduled
session → prep; complete session → notes) via `useEnsureWorkflow`; the orchestrator
(`src/lib/ai/orchestrator.js`) runs the agents and persists `AIReport`s.

See `CLAUDE.md` for the detailed architecture reference (models, routes, utility patterns).

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)
- OpenAI API key
- Stripe account (test mode for local dev)
- Resend account
- Google Cloud Storage bucket + service account

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

```env
# Database
MONGODB_URI=

# Auth.js v5
AUTH_SECRET=                 # openssl rand -base64 32
AUTH_TRUST_HOST=true

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=

# Stripe (test keys for local)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_SOLO=      # price_... for the Solo plan
NEXT_PUBLIC_STRIPE_PRICE_PRACTICE=  # price_... for the per-seat Practice plan

# Resend
RESEND_API_KEY=
RESEND_FROM=CogniCare <noreply@yourdomain>

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_BUCKET_NAME=
GOOGLE_CLOUD_CLIENT_EMAIL=
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Vercel Cron (appointment reminders)
CRON_SECRET=
```

### Stripe setup

Create two recurring prices (Solo, Practice per-seat) with a 14-day trial via
`subscription_data.trial_period_days` in the checkout code. Enable the Customer Portal (allow cancel,
plan switch, payment-method + quantity updates). Point a webhook at `/api/webhooks/stripe` for
`customer.subscription.created/updated/deleted`. Put the `price_...` IDs (not `prod_...`) in the env
vars above.

### Scripts

```bash
npm run dev     # dev server (Turbopack)
npm run build   # production build
npm run lint    # ESLint
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # Stripe webhook on dev
```

No test framework is configured.

## Documentation

- **`README.md`** — this file (overview + setup)
- **`docs/USER_GUIDE.md`** — how a therapist uses the app
- **`CLAUDE.md`** — architecture reference for working in the codebase
- **`docs/ROUND_*.md`** — historical build specs (changelog of how the app was built)

## Compliance

CogniCare is designed as a HIPAA-aligned product, but it is **not yet HIPAA-ready**. Before any real
client PHI is processed:

1. **OpenAI API BAA** — a Business Associate Agreement with OpenAI (via `baa@openai.com`) with
   Zero-Data-Retention enabled, must be signed.
2. **Field-level PHI encryption** — encryption at rest for `client.initialAssessment`,
   `session.notes`, `aiReport.payload`/`summary`, and `liamThread.turns`.

The app already implements audit logging, assignment-based access control, session timeouts, and
transport encryption (TLS via Vercel/Atlas). Until items 1–2 land, use **synthetic test data only**.

## License

Proprietary — © Anansi Technology LLC. All rights reserved.
