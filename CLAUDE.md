# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Engineering principle

Engineer from first principles, then apply Occam's razor: identify the actual invariant the product must preserve and implement the smallest design that preserves it. Do not add abstraction, state, or workflow unless the requirement demands it.

## Commands

```bash
npm run dev        # Next.js 15 + Turbopack dev server
npm run build      # Production build
npm run lint       # ESLint (next lint)
npm test           # Vitest (run once)
npm run test:watch # Vitest (watch mode)
```

Tests: Vitest, `npm test`. Cover clinical scoring (PHQ-9/GAD-7/WHO-5 bands + safety flags + direction), `computeDirection`, age helpers, billing status, recurrence date math, and practice scoping. Run before any PHI-touching change.

## Architecture

**Stack**: Next.js 15 App Router · React 18 · MongoDB (Mongoose) · NextAuth v5 (JWT) · OpenAI (`ai` SDK v5) · Stripe · Google Cloud Storage · Resend · Tailwind CSS v4 · shadcn/ui

**Deployed on Vercel** with a daily cron at `/api/cron/appointment-reminders`.

### Multi-Tenancy

Every document in every collection is scoped by `practiceId`. A practice is automatically created when a user signs up; solo practitioners are a practice of one. Never query without a `practiceId` filter unless building admin tooling.

Role hierarchy: `admin` (practice owner) > `counselor`. The session JWT carries `practiceId`, `role`, `isPracticeOwner`, and `stripeSubscriptionStatus` — use these instead of a separate DB lookup where possible.

**Scope guard is universal**: every API route that reads or writes client-linked data must enforce `visibleClientIds`/`clientScope` before loading context, calling models, or returning data — including when modifying pre-existing routes. Unauthorized = non-revealing 404. Enforced structurally by `src/app/api/scope-guard.test.js`, which walks every route touching `clientId` and asserts the guard import; exemptions (token-auth, cron) must be justified in that file.

### Auth

- **Edge-safe config**: `src/auth.config.js` — no Mongoose, used by middleware
- **Full config**: `src/auth.js` — credentials provider, JWT enrichment, audit events
- **Middleware**: `src/middleware.js` — matcher covers `/clients`, `/sessions`, `/admin` only. `/login` and `/signup` are NOT in the matcher; those pages handle their own auth redirect via `useEffect`.
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
| `AIReport` | Single AI agent output per session; has `agentType`, `status` (draft/approved), `version`, `payload` |
| `Report` | Clinician-compiled report assembled from AIReports |
| `Invoice` | Client billing; may have Stripe payment link |
| `AuditLog` | HIPAA compliance trail — log all PHI access |
| `ConsentForm` | Token-based e-signature request |
| `Invitation` | Practice team invite (token + expiry) |
| `LiamThread` | Rolling copilot conversation memory per (user, client) |
| `MeasureAdministration` | Scored clinical instrument administration; `isBaseline` flag marks intake measurements |

### AI Agent System (`src/lib/ai/`)

Six specialized agents run after sessions: `assessment`, `diagnostic`, `treatment`, `progress`, `documentation`, `report`. Each stores its output as an `AIReport` document. Orchestration lives in `src/lib/ai/orchestrator.js`; individual agent configs in `src/lib/ai/agents/`. Prompt templates are in `prompts/`.

**Agent triggers are deliberate, not automatic.** Intake assessment (`IntakeAssessment` component) and session prep (`AutoSessionPrep` component) both require an explicit clinician click — they never fire automatically on page open. This mirrors the principle: AI assists when the clinician decides.

**Two AI display components:**
- `src/app/components/clients/ClientInsights.js` — client-scoped (Overview tab): shows assessment, diagnostic, treatment plan (editable/approvable), progress. Treatment plans can be re-edited after approval via an "Edit plan" button.
- `src/app/components/sessions/SessionAIInsights.js` — session-scoped; accepts a `focus` prop. `focus="session"` shows only Treatment + Progress (hides assessment/diagnostic). Default shows all four.

**Prompt guidelines** (applied to all four agent prompts in `prompts/`):
- Terseness instruction: "Be terse and clinically precise… no filler, no hedging boilerplate."
- Soft-cap counts: ~3-4 goals, ~3-5 interventions, ~1-3 homework (treatment); ~2-3 ranked differentials (diagnostic); ~3-5 concerns, ~3 risk/protective factors (assessment); ~3 barriers, ~3 recommendations (progress). These are prompt-guided only — schemas remain unconstrained arrays.

**Liam** (`src/lib/ai/liam/`) is a separate in-session copilot with per-thread rolling memory stored in `LiamThread`. The chat panel (`src/components/liam/LiamSheet.jsx`) is 480px wide.

**LIAM statelessness**: all LIAM OpenAI calls (generation AND the rolling-summary compression) set `store: false`. The server-owned `LiamThread` is the sole conversation history; model input = memory block + the newest user message only — never resent browser messages (they're display state).

**LIAM memory integrity**: only successful, non-empty user/assistant exchanges persist to `LiamThread` — aborted, failed, or empty generations never enter memory (empty user text is a 400; empty assistant text skips `appendExchange`).

### Measurement-Based Care (`src/lib/mbc/`)

Four instruments are registered: **PHQ-9** (depression, lower=better), **GAD-7** (anxiety, lower=better), **WHO-5** (wellbeing, higher=better), **C-SSRS** (suicide-risk screener, categorical). The `direction` field on each summed instrument JSON drives score interpretation throughout.

**C-SSRS is categorical, not summed** (`scoring.method: "categorical"`): branching items via per-item `showIf`, result is a risk tier (`none|low|moderate|high` — highest `tierIfYes` among endorsed items, per Columbia's triage protocol), never a total. Trend/RCI/overdue logic skips categorical instruments entirely. The tier is stored as a top-level **unencrypted** field on `MeasureAdministration` for lean dashboard reads (responses/flags stay encrypted). Wording is Columbia's verbatim with attribution — never paraphrase instrument text. Risk surfacing (PHQ-9 item-9 trigger banner, elevated-tier banner, dashboard risk signal) is content-anchored via `computeRiskSummary` in `src/lib/mbc/risk.js` — the latest administration decides; time never clears anything. Copy discipline: "Screener indicates elevated risk — clinical judgment required." — never a diagnosis or safe/unsafe verdict. `SafetyPlan` (Stanley-Brown, one per client, content encrypted) lives at `/api/clients/[id]/safety-plan`; agents and the dashboard see existence + `reviewedAt` metadata only.

**Always use the registry — never hardcode instrument IDs:**
```js
import { listInstruments } from "@/lib/mbc/instruments";
const instruments = listInstruments(); // returns all registered instruments
```

Key files:
- `src/data/instruments/phq9.json`, `gad7.json`, `who5.json` — instrument definitions with `shortName`, `direction`, `bands`, `reliableChange`, `criticalItems`
- `src/lib/mbc/instruments.js` — registry; `listInstruments()` is the single source of truth
- `src/lib/mbc/score.js` — `scoreInstrument()`, `computeDirection(delta, inst)` (exported, tested)
- `src/lib/mbc/trend.js` — `getTrend()` returns `{ latest, delta, direction, percentageFactor, scoringMax, points[] }`
- `GET /api/instruments` — returns all registered instruments (used by MeasuresPanel, MeasureGlance, etc.)
- `GET /api/clients/[id]/measures?instrumentId=X` — returns trend data for one instrument

**WHO-5 scoring note**: scores multiply by 4 for a 0-100% scale (`percentageFactor: 4`). A raw score ≤13 (≤52%) screens for depression.

### MeasuresPanel (`src/components/measures/MeasuresPanel.jsx`)

Accepts three rendering modes via props:
- Default — administer picker + trend cards + history
- `compact` — administer picker + form only (used in intake baseline card and session detail)
- `sections` — three labeled sections: Administer / Trends / History (used on Assessments tab)

### Client Detail Tabs (`src/app/components/clients/ClientDetail.js`)

Tab names: `overview`, `sessions`, `reports`, `progress` (labelled "Assessments" in UI), `consent-billing`. Legacy URL aliases (`insights→overview`, `analytics→progress`, `measures→progress`, `assessments→progress`) are handled by `TAB_ALIAS`.

The **Sessions tab** fetches the full session list via `GET /api/sessions?clientId=X` (not the 5-item `recentSessions` from the client endpoint). Sessions are sorted upcoming-first (ascending by date), then past (descending). Use `sortSessionsForDisplay()` for this pattern.

The **Overview tab** shows `MeasureGlance` (compact stat chips, one per instrument) above `ClientInsights`, only after an assessment exists.

### Sessions List (`src/app/components/sessions/SessionList.js`)

The `/sessions` page filters and sorts client-side. The `filteredSessions` memo applies `sortSessionsForDisplay` logic inline — upcoming first, then most-recent past.

### Utility Patterns

- **MongoDB connection**: `src/lib/mongodb.js` — cached global singleton, always import this, never instantiate directly.
- **MongoDB aggregation**: `aggregate()` does NOT auto-cast strings to ObjectId (unlike `find()`). Always wrap practiceId/counselorId with `new mongoose.Types.ObjectId(id)` in pipeline `$match` stages.
- **Audit logging**: `src/lib/audit.js` — call `logAudit()` for any PHI read/write. The `AuditLog` model enforces a closed enum for `action` and `entityType`; check those before adding new values.
- **Content hashes are stamped on write**: any write that changes `AIReport.payload` or `Session.notes` restamps `payloadHash`/`notesHash` — enforced by `pre("save")` hooks on the models (registered BEFORE the encryption plugin so they see plaintext), not by per-route discipline. Aggregates and GET routes read the stored hash; compute-on-read is a fallback for pre-backfill docs only. If you add a write path that bypasses `save()` (`updateOne`/`findOneAndUpdate` touching payload/notes), you must restamp explicitly.
- **Consent**: `isConsented({ forms, client })` in `src/lib/consent.js` is the one definition of "consented to AI processing" (signed form OR in-person override). Never re-derive it inline.
- **PDF generation**: `src/lib/report-pdf.js` and `src/lib/consent-pdf.js` render HTML through headless Chrome (`puppeteer-core` + `@sparticuz/chromium`, both declared in `serverExternalPackages`). Shared fonts, letterhead, `esc()`, and the `htmlToPdfBuffer()` driver live in `src/lib/pdf/shared.js`. Fonts are base64 TTFs embedded as `@font-face` data URIs, so `page.pdf()` must be preceded by `await page.evaluateHandle("document.fonts.ready")` or Chrome silently renders fallback fonts. Escape all user/clinical data with `esc()`; full Unicode is supported (no WinAnsi limitation). Invoice PDFs (`api/clients/[id]/invoices/*`) still use `pdf-lib` and draw text directly.
- **File storage**: `src/lib/storage.js` wraps Google Cloud Storage — no local disk writes for documents.
- **Plans/pricing**: `src/config/plans.js` is the source of truth for subscription tier limits.

### UI Gotchas

**shadcn Sheet width override**: The Sheet component (`src/components/ui/sheet.jsx`) hardcodes `data-[side=right]:sm:max-w-sm` in its base class. This attribute selector has higher CSS specificity than a plain class, so `sm:max-w-[Xpx]` in `className` loses. Use the Tailwind important modifier: `sm:!max-w-[480px]`.

**useSession dependency**: Use `status` (string) not `session` (object) as a `useEffect` dependency to avoid re-triggering on NextAuth's background session refetch, which would remount forms and wipe user input.

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

This is a HIPAA-aligned healthcare product. All client/session data is PHI. Every API route that reads or writes PHI must call `logAudit()`. The repo is public by owner decision (source only — PHI lives in the database, never in the repo). Because it is public: never commit PHI, credentials, `.env` files, database dumps, or real client data in fixtures, tests, or screenshots.

## Sky design system (UI overhaul)

### Tokens

Source of truth is `src/app/globals.css`. Prefer `var(--*)` where a token exists; hardcode hex only where none does. Never guess a token name.

| Role | Hex | CSS var |
|---|---|---|
| Navy headings/text | `#0B2B6B` | `--foreground` |
| Primary blue | `#2F80FF` | `--primary` / `--ring` |
| Teal accent | `#158A98` | `--accent` |
| Cyan | `#25B9C8` | `--chart-4` |
| Green | `#3B9E57` / `#4DBB6A` | `--chart-1` |
| Amber | `#A9821F` | — |
| Danger | `#C0392B` | — |
| Soft-sky surface | `#F2F7FD` / `#EEF4FB` | `--secondary` |
| Inset background | `#F7FAFE` | — |
| Card | `#fff` | `--card` |
| Muted text | `#55698F` / `#8298BC` / `#7C93B8` | `--muted-foreground` |
| Borders | `#E3ECF7` / `#E9F0F9` / `#E7EEF7` | `--border` |
| Row hover | `#F5F9FE` | — |

### Typography

- Headings: **Bricolage Grotesque** — `var(--font-bricolage)`, wired in `layout.js`
- Body: **Hanken Grotesk** — `var(--font-hanken)`
- Wordmark: `@/components/Brand` — never re-implement inline
- Page eyebrow: `12.5px / 700 / uppercase / letter-spacing .12em / #2F80FF`
- Page H1: Bricolage ~34px / 800 / `#0B2B6B`

### Cards & shapes

- Card radius: 18–20px; shadow `0 22px 50px -40px rgba(11,43,107,.4)` (list cards) / `.3` (settings)
- Pill / button radius: 10–11px

### Reusable patterns

**Status pill scale** — `fontSize 11.5 / fontWeight 700 / borderRadius 999`:

| State | bg | color |
|---|---|---|
| active / completed / signed / paid | `#E7F6EC` | `#3B9E57` |
| scheduled | `#E2F4F2` | `#158A98` |
| pending / in-progress | `#FBF2DA` | `#A9821F` |
| expired / no-show | `#FDECEC` | `#C0392B` |
| inactive / cancelled | `#EEF1F5` | `#6E7E97` |
| client-completed | `#E4F1FF` | `#2F80FF` |

**Spinner** — `@/components/ui/Spinner` (branded conic ring). Sizes: 56 full-page, 40 section, 16–22 in-button. Replaces the old two-border `animate-spin` div.

**Avatars** — `@/lib/avatar` (`avatarColors`, `initials`). Use only on person-identity cells: Clients list, Sessions client column, Team clinicians. Do NOT use on document lists (Reports) or event logs (Audit).

**Shared table pattern** — white rounded-18 card; `#F6FAFE`/`#F2F7FD` header with 11.5px uppercase `#8298BC` labels; `divide-y` rows; hover `#F5F9FE`; Sky status pills; primary "New" pill button; muted empty state.

**AI report components** — `@/components/ai/Section.jsx` (legacy collapsible shell + document mode via optional `id`/`sticky`/`actions`/`nudge`/`draft` props) + `@/components/ai/AgentReportBody.jsx` (assessment / diagnostic / treatment / progress / documentation bodies). Edit read-mode presentation only — never touch editable branches, field keys, or props. These are shared by the client Overview tab AND session detail views. Severity/trend/goal scales live in `AgentReportBody`'s `SEV` / `CONFIDENCE` / `GOAL` maps.

**Layout pattern** — the rail + continuous-document pattern (sticky scroll-spy nav, document-mode sections with sticky headers, status-pill vocabulary "Draft — review" / "Approved") is the standard for record views; new record-like screens should follow it.

**Inline per-field editing** — the standing rule: **read-document + inline fields for existing records; forms only for creation.** Existing records (AI reports, SOAP note, safety plan, client profile) render as the read-mode document; hovering a field reveals a pencil; editing is per-field in place via `InlineField`/`InlineEditScope` (+ `InlineText`/`InlineInput`/`InlineList`/`InlineEnum`) in `@/components/ai/editable`. Creation stays a form (new client/session, signup). Entry rule: *drafts invite editing* (fields inline-editable directly, no top-level pencil); *signed/approved records require intent* (one deliberate pencil click, then inline fields). Pins: field edits merge into the FULL payload/body and save through each record's existing debounced endpoint (no per-field endpoints — hash reconciliation depends on it); enum pills re-clicking the current value = close only, no PATCH, no editedAt; Escape cancels / Enter or outside-click commits. Header shows `SaveDot` (transient dot + persistent "Updated {Mon D}, {h:mm}" seeded from `updatedAt`) and, for reports, the 32px icon approve control.

**Pill-vocabulary split** — client Overview section headers use the icon approve control (green check; approved state = tinted badge with tooltip "Approved") + "Draft — review" text pill; the session view's read-only sections still use text pills for both states ("Approved" / "Draft — review"). Don't unify them without a design pass.

**Load-bearing copy** (ClientInsights / SessionAIInsights / SessionDetail) — labels and confirm-dialog copy carry clinical semantics: "Revise treatment plan", "Regenerate note & progress", and "Edit plan" are three different operations; the offer/nudge distinction (replace vs revise) and one-nudge precedence are intentional; confirm dialogs must keep the destructive phrasing "replaces the current versions". Never reword, merge, or soften these in a styling or copy pass.

**Dashboard aggregate contract** (`/api/dashboard/stats`) — extensions are additive-only (existing keys/consumers unchanged); every aggregate goes through `visibleClientIds` (counselor assignment — clinicians never see other clinicians' clients); "today" via `dayRangeInTz` with the practice timezone; review-queue/signals are metadata-only — never decrypt payloads in the aggregate. Staleness = stored-hash comparisons (`notesHash`/`payloadHash`/`sourceNotesHash`/`sourceDiagnosticHash` stamped by model pre-save hooks) — the same definitions as the client/session views; never invent a parallel staleness rule. Dashboard "Regenerate?" items only navigate — destructive flows live on the linked pages. Review = requires clinician action; signal = informs (RCI-based, ranked worsened → overdue → improved, instrument shortNames). Overdue threshold is a 28-day heuristic pending a per-practice cadence setting.

### Architecture notes

- Authenticated pages live under `src/app/(app)/` with the shared padded layout. Marketing/auth pages are intentionally full-bleed — never add the container to the root layout.
- Instrument JSONs (`src/data/instruments/*.json`) carry `shortName` (PHQ-9/GAD-7/WHO-5); the API and `getTrend` pass it through — use short names in pickers, pills, and titles. `MeasureTrend` "Latest X of Y" is score/max, not a date.

### Restyle status

**Done:** marketing/auth pages; app shell (Navbar, Billing/Subscription, Clients); LIAM sheet + citations; Spinner; shared table pattern (Clients + Sessions); Assessments tab; `AgentReportBody` read-mode; full Client Detail view (all tabs + `BillingInfo`/`InsuranceInfo`); Team, Profile, Audit, Settings; forms pass (ClientForm relayout + Sky field pattern in SessionForm and reports/new); client-portal consent page; Reports pipeline v2 (structured section generation, restyled viewer, HTML→PDF via `src/lib/report-pdf.js` + `serverExternalPackages`, shared `parseReportSections`); Client Overview v2 (navigator rail + continuous clinical document in `ClientInsights.js`, document-mode `Section.jsx` with sticky headers + action slots, nudges under headers); Session Detail v3 (same rail+document pattern across `SessionDetail.js`/`SessionNote.jsx`/`SessionAIInsights.js`, SOAP actions in the sticky section header); Dashboard v2 (morning triage view + additive `/api/dashboard/stats` extension: reviewQueue, signals, schedule enrichment; hash backfill shipped and run).

**Remaining gray holdouts:** none.

**Working rule:** UI changes are styling only — never alter data fetching, auth, routing, form contracts, or handler logic.
