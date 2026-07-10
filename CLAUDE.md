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

Tests: Vitest, `npm test`. Cover clinical scoring (PHQ-9/GAD-7/WHO-5 bands + safety flags + direction), `computeDirection`, age helpers, billing status, recurrence date math, and practice scoping. Run before any PHI-touching change.

## Architecture

**Stack**: Next.js 15 App Router · React 18 · MongoDB (Mongoose) · NextAuth v5 (JWT) · OpenAI (`ai` SDK v5) · Stripe · Google Cloud Storage · Resend · Tailwind CSS v4 · shadcn/ui

**Deployed on Vercel** with a daily cron at `/api/cron/appointment-reminders`.

### Multi-Tenancy

Every document in every collection is scoped by `practiceId`. A practice is automatically created when a user signs up; solo practitioners are a practice of one. Never query without a `practiceId` filter unless building admin tooling.

Role hierarchy: `admin` (practice owner) > `counselor`. The session JWT carries `practiceId`, `role`, `isPracticeOwner`, and `stripeSubscriptionStatus` — use these instead of a separate DB lookup where possible.

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

### Measurement-Based Care (`src/lib/mbc/`)

Three instruments are registered: **PHQ-9** (depression, lower=better), **GAD-7** (anxiety, lower=better), **WHO-5** (wellbeing, higher=better). The `direction` field on each instrument JSON drives score interpretation throughout.

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

This is a HIPAA-aligned healthcare product. All client/session data is PHI. Every API route that reads or writes PHI must call `logAudit()`. The repo is private and must never become public.

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

**AI report components** — `@/components/ai/Section.jsx` (collapsible shell: logo tile, subtitle, badge, rotating chevron) + `@/components/ai/AgentReportBody.jsx` (assessment / diagnostic / treatment / progress / documentation bodies). Edit read-mode presentation only — never touch editable branches, field keys, or props. These are shared by the client Overview tab AND session detail views. Severity/trend/goal scales live in `AgentReportBody`'s `SEV` / `CONFIDENCE` / `GOAL` maps.

### Architecture notes

- Authenticated pages live under `src/app/(app)/` with the shared padded layout. Marketing/auth pages are intentionally full-bleed — never add the container to the root layout.
- Instrument JSONs (`src/data/instruments/*.json`) carry `shortName` (PHQ-9/GAD-7/WHO-5); the API and `getTrend` pass it through — use short names in pickers, pills, and titles. `MeasureTrend` "Latest X of Y" is score/max, not a date.

### Restyle status

**Done:** marketing/auth pages; app shell (Navbar, Dashboard, Billing/Subscription, Clients); LIAM sheet + citations; Spinner; shared table pattern (Clients + Sessions); Assessments tab; `AgentReportBody` read-mode; full Client Detail view (all tabs + `BillingInfo`/`InsuranceInfo`); Session Detail (`SessionDetail.js` + `SessionNote.jsx`); Team, Profile, Audit, Settings.

**Remaining:** `src/app/(app)/client-portal/consent/[token]/page.js` — still old gray Tailwind. Needs Sky treatment: eyebrow + Bricolage title, Sky card, status-pill scale (signed→green / awaiting→amber), soft-sky body box, `border-input` + focus-ring fields, Sky success/error alerts. Preserve all token-auth/sign logic, `ConsentMarkdown`, the minor/guardian branch, and the ESIGN copy.

**Working rule:** UI changes are styling only — never alter data fetching, auth, routing, form contracts, or handler logic.
