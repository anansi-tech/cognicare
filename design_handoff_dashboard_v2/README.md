# Handoff: Dashboard v2 — clinician's morning view

## Overview
Rethink `src/app/(app)/dashboard/page.js` from generic stats into a morning triage view. Single column,
priority order: **Today's schedule → Needs your review → Client signals → practice pulse (compact strip)
→ recent activity (slim)**. Same Section/pill/typography vocabulary as Overview v2 — the dashboard must feel
like the same product. Mock: `CogniCare Dashboard v2.dc.html` (needs `support.js`). Tweak `reviewEmpty`
shows the caught-up state.

## This pass includes ADDITIVE backend work (exception to styling-only)
Extend **`/api/dashboard/stats`** — the dashboard keeps making ONE fetch. Constraints (from the user,
binding):
- **Additive only:** existing keys (`totalClients`, `recentActivity`, `activeSessions`, `completedSessions`,
  `reportsGenerated`, `todaysAppointments`, `upcomingThisWeek`) unchanged; existing consumers unaffected.
- **clientScope everywhere:** every new aggregate goes through the same clientScope rule as the rest of the
  app — a clinician sees ONLY their assigned clients' items. Signals and review items must respect counselor
  assignment (shared-practice clinicians never see each other's clients).
- **Practice timezone:** "today" via the existing `dayRangeInTz` helper.
- **Metadata only:** review-queue items carry {type, clientId, clientName, title/reportType, status,
  createdAt/date, sessionId?, reportId?} — NEVER decrypt or include report/note payload content in the
  dashboard aggregate.

### New keys
- `reviewQueue: [...]` — items requiring clinician ACTION (rule: review = requires action; signal = informs):
  1. Draft AI reports (assessment/diagnostic/treatment/progress) — `status: "draft"`.
  2. Draft SOAP notes — session notes with `status: "draft"`.
  3. Active staleness prompts — the hash-based offer/nudge conditions (notes changed since note/progress
     generated; diagnosis changed since plan version) — reuse the SAME hash comparisons as
     ClientInsights/SessionAIInsights; do not invent a parallel staleness definition.
  4. Unsigned consent forms (pending/sent) — they BLOCK AI processing.
  5. Completed sessions with empty `notes` (clinician-requested).
  Sort: oldest first (longest-waiting on top). Cap ~10 with a total count.
- `signals: [...]` — informational measure movements, ranked: **reliable deterioration first** (RCI-based,
  reuse the existing reliable-change computation from trends), then **overdue re-administrations** (per
  reassessment cadence), then **improvements last**. Cap ~5, most-recent-first within severity. Unit is a
  sentence: "PHQ-9 reliably worsened (+7)" — use instrument `shortName`. Exclude overdue reassessments from
  reviewQueue — they belong here.

## UI spec (mock is the target)
- **Header:** eyebrow = weekday + date (practice tz), Bricolage greeting (existing hour-based logic +
  first name), subtitle "N sessions today · N items need your review" (anchor-links to the review card).
- **Today's schedule:** existing card, rows enriched — avatar (`@/lib/avatar`), "First session" blue pill
  when it's the client's first, prep pill on the right: "Brief ready" (green, session-prep report exists) /
  "Consent pending" (amber) — derive from data already in the aggregate; row links to session. Keep the
  "N more in the next 7 days →" link and the no-appointments empty state.
- **Needs your review:** card with amber count pill in the header. Rows: status dot (amber draft, red stale,
  slate missing-notes) + title + "{client} · {context date}" meta + right-side action pill ("Approve" amber,
  "Regenerate?" amber, "Add notes" slate) + chevron. Deep links: drafts → the exact section
  (`/clients/{id}?tab=overview` or `/sessions/{id}`), stale → session, consent → Billing & Consent tab,
  missing notes → session. Empty state: "You're all caught up." (green) + muted subline.
- **Client signals:** header with muted "From measure trends — informational". Rows: severity pill
  (worsened red / overdue amber / improved green, uppercase, fixed min-width) + "**{Client}** — {sentence}"
  + chevron → client Assessments tab.
- **Practice pulse:** the four stat cards collapse to a 4-up strip of small cards (number + label, links
  preserved: /clients, /sessions, /sessions?status=completed, /reports). 2-up on narrow.
- **Recent activity:** slim single-line rows (text + relative date), keep `handleActivityClick` routing.
  Existing icon-tile layout goes.
- Mobile: single column already; schedule first, pulse 2-up.

## Load-bearing
- Staleness definitions: reuse the exact hash comparisons; the dashboard must never disagree with the
  client/session views about what's stale.
- "Regenerate?" on the dashboard only NAVIGATES to the session (where the confirm-dialog flow lives) —
  never triggers regeneration directly from the dashboard.
- Pill vocabulary matches app-wide scales; instrument short names everywhere.
- Auth redirect, Spinner loading state, greeting logic unchanged.

## Source of truth (live @ `main`)
`src/app/(app)/dashboard/page.js`, `/api/dashboard/stats` route, clientScope helper, `dayRangeInTz`,
RCI/trend computation in the measures lib, `@/lib/avatar`, `src/app/globals.css`.
