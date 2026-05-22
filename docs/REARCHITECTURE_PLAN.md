# CogniCare Rearchitecture — Anansi LLC

> Living plan for the move under Anansi LLC. Generated from a Claude Code planning session.
> Status: approved, not yet executed. Execution is done in rounds (see bottom of this doc).

## Context

CogniCare is a HIPAA-aligned mental-health practice management app built ~18 months ago: Next.js 15 (App Router, JavaScript), MongoDB+Mongoose, NextAuth v4 (credentials, 30-min JWT), Tailwind v4 with no component library, OpenAI GPT-3.5-turbo. The **core product premise is multi-agent AI handling the bulk of a therapist's clinical workflow** — assessment, diagnosis, treatment planning, progress tracking, and documentation. Those specialist agents stay; they *are* the product.

The owner is moving CogniCare under **Anansi LLC** and wants:
- Specialist agents kept but their plumbing simplified (in-process orchestration, externalized prompts, unified schemas, current-gen model)
- The existing conversational agent (`/api/ai/conversational`, surfaced today via the broken-on-mobile `SessionAssistant` widget) **renamed to LIAM** and given a better UI surface. Its purpose is unchanged: the therapist is in session with a client and wants to consult the AI about that session or client.
- Streamlined pricing infrastructure (the current setup mirrors Stripe state in Mongo with custom endpoints for every lifecycle action — far more code than the two-tier offering warrants)
- Modernized UI/UX
- Refreshed documentation under the Anansi LLC umbrella

**No production users yet** — we can delete legacy code and data freely, no migration scripts, no feature flags for safety, no backward-compatibility shims. Stay on MongoDB. Stay on JavaScript. LIAM is a name, not an acronym.

---

## 1. The Agent Layer

### Specialist agents (retained, simplified internals)

| Agent | Owns | Triggered by |
|---|---|---|
| **Assessment** | Risk evaluation, concerns, priorities | Intake workflow; reassessment; UI button |
| **Diagnostic** | DSM-5 / ICD-10 diagnosis, differentials, comorbidities | Intake; UI button |
| **Treatment** | Evidence-based plan, goals, interventions | Pre-session workflow; UI button |
| **Progress** | Goal tracking, treatment effectiveness, reassessment triggers | Post-session; UI button |
| **Documentation** | SOAP-format clinical notes | Post-session workflow; UI button |

Each agent stays a distinct module with its own prompt and Zod payload schema. What changes:

- **One shared base** in `src/lib/ai/baseAgent.js` that handles model selection, prompt caching, structured-output parsing, and error handling. Specialists become ~30-line modules that load a prompt and declare a schema.
- **In-process orchestration**: today's `/api/ai/agent-workflow` makes sequential `fetch()` calls between agent routes with cookie forwarding. We replace it with a single in-process orchestrator (`src/lib/ai/orchestrator.js`) that calls the agent modules as functions. One HTTP round-trip per workflow instead of three.
- **Prompts externalized** to `/prompts/*.md` (one file per agent + LIAM). Versioned markdown a clinical advisor can review without reading JS.
- **One unified schema**: today's six 95%-overlapping schemas in `src/lib/ai/schemas.js` collapse to a single `ReportEnvelope` with a discriminated-union `payload`. Each agent declares its payload variant.

### LIAM — the renamed conversational agent

LIAM is the existing conversational agent (`/src/app/api/ai/conversational/route.js`) under a new name. Same job: the therapist consults it about the current client or session ("any prior SI flags?", "what did we cover last week?", "what's a good CBT homework for this presentation?"). Same retrieval pattern: pull the client, the last ~10 sessions, and the last ~10 specialist reports into prompt context, return a response plus `relevantData` (session/report IDs the UI can deep-link to).

**What changes:**
- **Renamed** in code, copy, model labels (`AIReport.source`), and UI: `liam`, "Ask LIAM", `/api/liam/chat`.
- **Streaming on.** Today it's a blocking JSON call. Switch to Vercel AI SDK's `streamText` so responses feel instant.
- **Per-client thread memory.** Today every query is stateless. Add a `liam_threads` collection keyed by `(userId, clientId)` storing the last N turns + a rolling summary, so follow-ups don't lose context.
- **Prompt structured for OpenAI's automatic prefix caching** — system prompt and per-client context block come first so they cache between turns on repeated questions about the same client.
- **Better UI.** Replace the fixed 600px-wide `SessionAssistant` with a responsive shadcn `Sheet`: right rail on desktop, bottom sheet on mobile. Available from any client or session page, auto-bound to that route's context. Cmd-K opens it from anywhere.

No new tools, no voice input, no separate "live session" page — out of scope.

### Model upgrade — stay on OpenAI

Keep the existing `openai` + Vercel AI SDK stack. The real win is moving off GPT-3.5-turbo, which is two generations behind on clinical reasoning and structured-output quality. No provider switch needed.

- `gpt-4.1` — specialists and LIAM
- `gpt-4o-mini` — background jobs (session-title autogen, audit summarization, weekly digests)

**Prompt caching** — OpenAI applies automatic prefix caching to repeated input prefixes ≥ 1024 tokens. We structure prompts so cacheable parts come first (system prompt → agent/tool instructions → per-client context block → per-request tail). Free and zero code changes; cache hits show up as discounted input tokens in usage reporting.

**Streaming:** LIAM streams via Vercel AI SDK's `streamText`. Specialists return structured JSON via `generateObject` against the unified `ReportEnvelope`. The today-unused `createAgentStream` abstraction in `src/lib/ai/baseAgent.js` becomes LIAM's real path.

### AI module layout

```
src/lib/ai/
  client.js                # OpenAI SDK singleton, model registry
  baseAgent.js             # shared run() with structured output + streaming via Vercel AI SDK
  orchestrator.js          # intake / pre-session / post-session workflows, in-process
  prompts.js               # markdown loader for /prompts/*.md
  schemas.js               # ReportEnvelope + discriminated payloads
  agents/
    assessment.js          # ~30 LOC: load prompt, declare schema, export run()
    diagnostic.js
    treatment.js
    progress.js
    documentation.js
  liam/
    agent.js               # streaming conversation with prompt caching, client/session/report retrieval
    memory.js              # per-(userId, clientId) thread memory in liam_threads
```

---

## 2. API Surface

```
POST /api/ai/assessment       → agents/assessment.js
POST /api/ai/diagnostic       → agents/diagnostic.js
POST /api/ai/treatment        → agents/treatment.js
POST /api/ai/progress         → agents/progress.js
POST /api/ai/documentation    → agents/documentation.js
POST /api/ai/workflow         → orchestrator.js (in-process, replaces /api/ai/agent-workflow)
POST /api/liam/chat           → streaming SSE (replaces /api/ai/conversational)
```

**Deleted outright:** `/api/ai/conversational`, `/api/ai/agent-workflow`, `/api/test/expire-trial`.

---

## 3. Database — MongoDB, hardened

- **Indexes:** `{ userId: 1, clientId: 1, sessionDate: -1 }` on `session.js`; `{ userId: 1, status: 1 }` on `client.js`; `{ clientId: 1, agentType: 1, createdAt: -1 }` on `aiReport.js`; `{ userId: 1, timestamp: -1 }` on `auditLog.js`.
- **Discriminators:** `src/models/aiReport.js` → Mongoose discriminator keyed on `agentType`. No more `Mixed`.
- **New collection:** `liam_threads` — per-(userId, clientId) conversation history (turns, rolling summary, last-active).
- **Field-level encryption:** `mongoose-field-encryption` on PHI fields (`client.notes`, `session.transcript`, `aiReport.content`, `liam_threads.turns`). Atlas at-rest encryption alone is insufficient for the BAA.
- **Connection tuning** in `src/lib/mongodb.js`: explicit `maxPoolSize`, `minPoolSize`, `serverSelectionTimeoutMS`, `bufferCommands: false`.
- **Subscription model deleted** (see §4).
- **Aggressive cleanup:** drop the dev database; no migration. Reseed clinical taxonomies (DSM-5 codes etc.) from JSON fixtures at boot.

---

## 4. Pricing — Stripe-hosted, two simple offers

Current state mirrors Stripe state in a `Subscription` Mongo model, with custom endpoints for create / cancel / auto-renew / status, a `checkClientLimit` middleware, and in-app trial tracking. For a two-tier offering (Trial → Single Therapist) this is far too much code.

**Two plans, one price each, all features unlocked. No client-count limits.** Client limits were always a proxy for "we want to charge per usage" — the cleaner answer is to charge per clinician.

| Plan | Price | Notes |
|---|---|---|
| **Solo** | $99 / month / clinician | All features. 14-day trial via Stripe's native `trial_period_days`. |
| **Practice** | $89 / month / seat (3+) | Same features, multi-clinician practice. Admin role enabled. Seats managed in the Stripe Customer Portal. |

**Implementation:**
- **Stripe is the source of truth.** Delete `src/models/subscription.js` and `src/lib/subscription-service.js`. Store only `stripeCustomerId` and `stripeSubscriptionStatus` on the User (the latter is a denormalized cache of the latest webhook).
- **Stripe Checkout** for sign-up (already in use; keep `/api/stripe/create-payment-link`, rename to `/api/billing/checkout`).
- **Stripe Customer Portal** for cancel / change plan / update card / toggle auto-renew. Delete the custom endpoints `/api/subscriptions/create`, `/cancel`, `/auto-renew`. Replace with one `/api/billing/portal` that returns a portal session URL.
- **One webhook handler** at `/api/webhooks/stripe` listens to `customer.subscription.created/updated/deleted` and updates `User.stripeSubscriptionStatus` only. No custom state machine.
- **Access gate:** a single helper `hasActiveSubscription(user)` checks `user.stripeSubscriptionStatus in {trialing, active, past_due}`. No `checkClientLimit` middleware — delete `src/middleware/checkClientLimit.js`.
- **Trial:** configured on the Stripe price (`trial_period_days: 14`); no in-app tracking. Delete `createTrialSubscription`.

**Net result:** ~400 LOC of pricing infrastructure deleted; ~50 LOC of new code (webhook handler + portal endpoint + helper).

---

## 5. Authentication — Auth.js v5

In-place upgrade from NextAuth v4. (Clerk is rejected: PHI-adjacent identity in a third party complicates the BAA.)

- `src/lib/auth.js` → `src/auth.js` exporting `{ auth, handlers, signIn, signOut }`. `src/middleware.js` uses `export { auth as middleware }`.
- Add **Google provider** (clinicians use Workspace).
- **WebAuthn / passkey MFA** required for admin, optional for clinician v1, required v2. TOTP fallback.
- **Rolling sessions:** 30-min idle timeout with a 15-min activity ping (the hard 30-min cutoff mid-session is the kind of friction a clinician would tolerate exactly once).

---

## 6. Frontend / UX

Single opinionated stack, all JavaScript:

- **shadcn/ui** on Radix primitives — themeable via Tailwind v4 CSS variables already in place
- **react-hook-form + Zod resolvers** — kills manual `useState` in `ClientForm`, `SessionForm`, `UserForm`; reuses the same Zod schemas the API validates against
- **TanStack Query v5** — replaces ad-hoc `useEffect + fetch`
- **sonner** — replace `react-hot-toast`
- **next-themes** — wire to existing CSS variables in `globals.css`; toggle in user menu
- **cmdk** — command palette as LIAM's quick-ask entry
- **shadcn `<Skeleton/>` + `<Suspense>`** — ban literal `"Loading..."` strings
- **Re-enable ESLint** in CI as a hard error

**Layout:** new `(dashboard)` shell with collapsible left nav (Clients / Sessions / Reports / Billing / Settings), top bar with global search + cmdk hint. Mobile: nav becomes a bottom tab bar.

**LIAM surface:** shadcn `Sheet` component — right rail on desktop (`w-96`), bottom sheet on mobile. Opens from a button in the top bar, from Cmd-K, or auto-opens on client/session pages. Auto-binds to the current route's context (client ID, session ID). The fixed-width `SessionAssistant` is deleted.

---

## 7. API Layer

Keep REST for the external surface (Stripe webhooks, client portal, future mobile). For internal mutations from forms / RSC, use **Server Actions** with `useActionState` + RHF — share the Zod schema between the action and the form resolver. Skip tRPC.

---

## 8. Repo Structure Post-refactor

```
/cognicare
  /prompts/                  # markdown prompts for all six agents
  /src
    /app
      /(marketing)           # public site
      /(auth)                # login, register, mfa
      /(dashboard)           # authed app shell
        /clients, /sessions, /reports, /settings, /billing
      /(client-portal)
      /api
        /ai/{assessment,diagnostic,treatment,progress,documentation,workflow}
        /liam/chat
        /clients, /sessions, /reports, /audit
        /billing/{checkout,portal}
        /webhooks/stripe
    /components
      /ui                    # shadcn primitives
      /liam                  # sheet, message bubble, citation chip
      /clients, /sessions, /reports
    /lib
      /ai                    # see §1
      /db                    # mongoose models + connection
      /auth                  # auth.js, middleware helpers
      /audit, /storage, /stripe, /email
    /models                  # Mongoose models (with discriminators)
    /schemas                 # shared Zod (forms + API + agent tools)
    /hooks                   # TanStack Query hooks
    /server                  # Server Actions grouped by domain
  /docs
    ARCHITECTURE.md, HIPAA_COMPLIANCE.md, CONTRIBUTING.md, REARCHITECTURE_PLAN.md
  CLAUDE.md
  README.md
```

`src/app/context/AIWorkflowContext.js`, `src/middleware/checkClientLimit.js`, `src/lib/subscription-service.js`, `src/models/subscription.js`, the old `SessionAssistant.js`, and all six legacy AI route handlers (their prompts are gone, the routes get thin replacements) — all deleted.

---

## 9. Documentation — Anansi LLC

- **README.md** — rewrite around Anansi LLC. CogniCare as the flagship; multi-agent clinical AI as the headline; LIAM as the in-session consultant. Quickstart, env-var table, deploy notes, screenshots.
- **CLAUDE.md** (new, root) — for Claude Code: build/test commands, conventions (Server Actions for mutations, prompts live in `/prompts`, do-not-edit generated shadcn files), the agent module pattern, common tasks.
- **docs/ARCHITECTURE.md** (new) — diagrams of the agent layer, the LIAM consult flow, prompt structure for cache hits, request flow, data model with discriminators.
- **docs/HIPAA_COMPLIANCE.md** — refresh for: Auth.js v5 session policy, MFA matrix, **OpenAI BAA status (must be in place; uses Zero Data Retention endpoints)**, field-level encryption, audit-log retention, breach response.
- **docs/CONTRIBUTING.md** (new) — branch model, conventional commits, **prompt-edit review process (clinical advisor signoff required)**.
- **LICENSE / footer / emails** — Anansi LLC branding everywhere; "An Anansi LLC product."

---

## 10. Performance Wins

- **In-process orchestration** — intake workflow drops from 3 sequential HTTP POSTs to 1 round-trip with 2 in-process agent calls
- **Prompt caching** — input-token reduction on warm specialist and LIAM calls via OpenAI's automatic prefix caching
- **Edge runtime** for `/api/liam/chat` streaming + middleware; keep Mongoose routes on Node
- **RSC + Suspense** — dashboard pages become server components fetching in parallel
- **Mongo indexes** as in §3
- **next/image** for avatars/uploads through GCS
- **Bundle:** drop `axios`, `react-hot-toast`; add `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `sonner`, `next-themes`, `cmdk`. Keep `openai`, `ai`, `@ai-sdk/openai`.
- **Background jobs** (audit summarization, weekly digest) on Vercel Cron + GPT-4o-mini, not synchronous

---

## Build Order (~6 weeks, no users to protect)

Since no one uses the app, we cut over directly instead of running old and new in parallel.

1. **Week 1 — Foundations.** Re-enable ESLint as a hard error. Install shadcn/ui, `next-themes`, `sonner`, TanStack Query. Drop unused deps. Drop the dev Mongo database; reseed fixtures.
2. **Week 2 — Agent layer.** Build `src/lib/ai/{client,baseAgent,orchestrator,prompts,schemas}.js` and the five specialist modules. Externalize prompts to `/prompts/*.md`. Upgrade model to `gpt-4.1` (specialists + LIAM) and `gpt-4o-mini` (background). **Confirm the OpenAI BAA is in place and Zero Data Retention is enabled before any PHI touches the new path.** Replace each `/api/ai/<type>/route.js` with a thin handler.
3. **Week 3 — LIAM.** Implement `src/lib/ai/liam/{agent,memory}.js` and `/api/liam/chat` (streaming + `liam_threads` memory). Build the shadcn `Sheet` surface, route-context binding, and the Cmd-K palette. Delete `SessionAssistant.js` and `/api/ai/conversational`.
4. **Week 4 — Pricing rip-out.** Delete `Subscription` model, `subscription-service.js`, `checkClientLimit` middleware, and the four custom subscription endpoints. Add `/api/billing/{checkout,portal}` and a slim webhook handler. Reconfigure Stripe with `trial_period_days: 14` on the Solo price; add a Practice price.
5. **Week 5 — Auth + DB hardening.** Auth.js v5 upgrade. Google provider + WebAuthn. Mongo indexes, `aiReport` discriminator, field-level encryption.
6. **Week 6 — UX refresh + branding.** Convert forms to RHF + Zod. Replace fetch-in-useEffect with TanStack Query. Dark mode toggle live. Mobile layout. Anansi LLC branding in all UI, emails, footers. Final docs pass.

---

## Critical Files

**Deleted:**
- `src/app/api/ai/conversational/route.js`
- `src/app/api/ai/agent-workflow/route.js`
- `src/app/api/test/expire-trial/route.js`
- `src/app/api/subscriptions/{create,cancel,auto-renew,status}/route.js`
- `src/lib/subscription-service.js`
- `src/middleware/checkClientLimit.js`
- `src/models/subscription.js`
- `src/app/components/SessionAssistant.js`
- `src/app/context/AIWorkflowContext.js`
- `src/lib/ai/baseAgent.js` (legacy) and `src/lib/ai/schemas.js` (legacy)
- Inline prompts inside `src/app/api/ai/{assessment,diagnostic,treatment,progress,documentation}/route.js`
- Stray repo-root files: `next.config.js` duplicate (keep `.mjs`), `stripe.exe`, `stripe cli.txt`

**Rewritten:**
- `src/app/api/ai/{assessment,diagnostic,treatment,progress,documentation}/route.js` — now thin handlers calling `src/lib/ai/agents/<name>.js`
- `src/app/api/ai/workflow/route.js` — in-process orchestrator entry
- `src/lib/auth.js` → `src/auth.js` (Auth.js v5); `src/middleware.js` updated
- `src/models/aiReport.js` — discriminator + field-level encryption
- `src/models/{client,session,auditLog,user}.js` — indexes, encryption, `stripeCustomerId`/`stripeSubscriptionStatus` on user
- `src/lib/mongodb.js` — pool tuning
- `src/config/plans.js` — two plans (Solo, Practice); no feature flags or limits
- `package.json` — drop `axios`, `react-hot-toast`; add `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `sonner`, `next-themes`, `cmdk`. Keep `openai`, `ai`, `@ai-sdk/openai`.
- `next.config.js` — remove `eslint.ignoreDuringBuilds`
- All forms in `src/app/components/clients/`, `sessions/`, `users/` → RHF + Zod

**New:**
- `/prompts/{assessment,diagnostic,treatment,progress,documentation,liam.system}.md`
- `src/lib/ai/{client,baseAgent,orchestrator,prompts,schemas}.js`
- `src/lib/ai/agents/{assessment,diagnostic,treatment,progress,documentation}.js`
- `src/lib/ai/liam/{agent,memory}.js`
- `src/app/api/liam/chat/route.js`
- `src/app/api/billing/{checkout,portal}/route.js`
- `src/components/ui/*` (shadcn), `src/components/liam/*`
- `src/hooks/*` (TanStack Query hooks per resource)
- `src/server/*` (Server Actions)
- `src/models/liamThread.js`
- `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`

---

## Verification

End-to-end smoke after each week:

1. **Week 1:** `npm run dev` boots; `npm run lint` passes with ESLint as a hard error; shadcn primitives render in a scratch page.
2. **Week 2:** For each specialist agent, fire `/api/ai/<type>` with sample input; output validates against `ReportEnvelope`; a clinical-advisor spot-check confirms parity with the old prompts. Run the intake workflow end-to-end — single HTTP round-trip, both agents run in-process, both reports persist.
3. **Week 3:** On a client or session page, open the LIAM sheet, ask "any prior risk flags?" — response streams, cites the relevant session(s), and the citation chips deep-link to those sessions. Ask a follow-up — LIAM has thread memory and resolves the pronoun correctly. Cmd-K opens LIAM from anywhere. Mobile bottom sheet renders.
4. **Week 4:** Brand-new user → Stripe Checkout → 14-day trial active. Open Customer Portal → cancel → webhook fires → `User.stripeSubscriptionStatus` flips to `canceled`. No app code touches Stripe state outside the webhook.
5. **Week 5:** Log in via Google; register a passkey; verify rolling-session activity ping renews the JWT; create a client, write a note, confirm the note is encrypted in MongoDB and decrypts on read.
6. **Week 6:** Submit `ClientForm` with invalid data — Zod errors surface inline; valid submissions optimistically update the list. Dark mode toggle persists. Anansi LLC branding visible in footer, emails, login page. `npm run build` clean.

Full manual smoke at the end: sign up via Stripe Checkout → log in via Google → register passkey → create client → run intake workflow (Assessment + Diagnostic in-process) → schedule session → during the session open LIAM and consult about the client → end session → Progress + Documentation agents run → view the SOAP note → check audit log → open Customer Portal to manage billing → log out.

---

## Round Tracker

Execution is broken into rounds. Each round is a focused, committable chunk.

| Round | Scope | Status |
|---|---|---|
| 0 | Save plan to repo, set up branch | done |
| 1 | TBD with owner | pending |
| 2 | TBD | pending |
