# Round 38 — Sessions: full list, correct sort, deliberate session prep

> Branch `dev`, working dir `cognicare`. Three issues from testing: (1) client Sessions tab shows only
> 5 (it maps the capped `recentSessions`); (2) /sessions list sorts wrong (want upcoming-first); (3)
> opening a scheduled session auto-fires pre-session prep (a treatment revision) even for sessions
> days away — too eager, and it visually looks like the whole assessment regenerates. Make prep
> deliberate, consistent with the intake-trigger fix.

## Issue 1 — client Sessions tab shows all sessions (not just 5)
The tab maps `recentSessions`, which comes from the client GET endpoint capped at 5 (a dashboard-style
"recent" list). A full endpoint already exists: `GET /api/sessions?clientId=X` returns ALL sessions
for the client, sorted `date: -1`, scope-guarded.

Fix in `ClientDetail.js`:
- Add a `sessions` state + a `fetchClientSessions()` that calls
  `GET /api/sessions?clientId=${clientId}` and sets it.
- Call it when the **Sessions tab** is opened (and after creating/cancelling a session).
- The Sessions tab table maps `sessions` (full list), not `recentSessions`.
- Sort newest/upcoming first (see Issue 2 ordering — apply the same client-side sort).
- If lots of sessions, simple pagination or a scroll is fine; not required for v1 — full list sorted is
  the must-have. (Keep `recentSessions` only if something else uses it; otherwise the Overview already
  uses the glance, so this tab should use the full list.)

## Issue 2 — sort order: upcoming first, then recent past
Both the **/sessions** page and the **client Sessions tab** should order so the clinician sees what's
next, not the oldest. Desired order:
1. **Upcoming** sessions (date >= now) ascending — the soonest upcoming at the very top.
2. **Past** sessions (date < now) descending — most recent past next.

Pure sort helper (client-side; data already arrives, just reorder):
```js
function sortSessionsForDisplay(list) {
  const now = Date.now();
  const upcoming = list.filter((s) => new Date(s.date).getTime() >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));      // soonest first
  const past = list.filter((s) => new Date(s.date).getTime() < now)
    .sort((a, b) => new Date(b.date) - new Date(a.date));      // most recent first
  return [...upcoming, ...past];
}
```
Apply on `/sessions` page and the client Sessions tab. (Optional: a small "Upcoming" / "Past" divider
between the two groups — nice, not required.)

> Find the `/sessions` page's current fetch/render — it currently shows last-first/unsorted. Run the
> fetched list through `sortSessionsForDisplay` before rendering.

## Issue 3 — session prep should be deliberate, not auto-on-open
**Current behavior (verified):** `AutoSessionPrep` fires the `pre-session` workflow whenever
`sessionStatus === "scheduled"` and the session has no treatment report yet — i.e. **the moment you
open ANY scheduled session, even one 5 days out.** That workflow generates a treatment-plan revision
(Round 26). `SessionAIInsights` then re-renders all four agent sections, which *looks* like the whole
assessment regenerated (only treatment actually ran). Two problems: eager timing + confusing visual.

**This is the same lesson as the intake auto-fire we already fixed: deliberate beats automatic.**

Fix — make session prep a **manual action** (consistent with `IntakeAssessment`):
- Replace the auto-fire in `AutoSessionPrep` with a **"Prepare session" button** shown when the
  session is `scheduled` and has no prep/treatment revision yet:
  > "Prepare for this session — generates an updated treatment plan based on the latest progress."
  > [Prepare session]
- Clicking runs the `pre-session` workflow (reuse `useEnsureWorkflow`'s `run`, triggered by click —
  same pattern as `IntakeAssessment`). While running: "Preparing your session…". On done: refresh.
- Do NOT auto-run on open. Opening a future session just shows its details + existing insights (if
  any), no generation.
- **Optional nicety:** if the session is **today** (imminent), you may auto-prep — but given the
  "deliberate" preference you chose for intake, default to manual for ALL sessions for consistency.
  Manual everywhere is simpler and predictable.

Also fix the **visual confusion**: while prep runs, don't make it look like assessment/diagnostic are
regenerating. The "Preparing your session…" state should be a small inline indicator near the
treatment section, not something that blanks/reloads the whole `SessionAIInsights` block. If
`SessionAIInsights` shows a global loading state during prep, scope it so the existing
assessment/diagnostic/progress stay visible and only treatment shows "updating…".

## Acceptance
1. Client Sessions tab shows ALL the client's sessions (12 of 12), newest/upcoming first.
2. /sessions list and client Sessions tab order: soonest upcoming first, then most-recent past.
3. Opening a scheduled session does NOT auto-generate anything. A "Prepare session" button runs the
   pre-session treatment revision on click. A 5-days-out session opened for a glance generates nothing.
4. During prep, the assessment/diagnostic/progress sections don't appear to regenerate — only
   treatment updates.
5. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
fix(cognicare): client sessions show full list + upcoming-first sort; session prep is manual (no auto-fire on open)
```

## Note
Issue 3 mirrors the intake fix (Round 33): AI assists when the clinician decides, not on view. After
this, both intake assessment AND session prep are deliberate, predictable, and don't surprise-burn
tokens when the therapist is just browsing.
