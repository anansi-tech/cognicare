# Round 6 — Post-Test UX Cleanup

> Branch `dev`, working dir `products/cognicare`. Driven by real testing feedback. Theme: the 4b tab
> consolidation merged the top-level tabs but never went *inside* the AI components, so nested tab
> rows and triplicated signals remain. This round flattens them and resolves the "two different
> Progresses" naming collision. Also folds in five small queued fixes. No agent/schema changes.

## Root cause (one problem, five symptoms)

`ClientInsights` and `SessionAIInsights` each still carry their **own internal tab row** (emoji icons
🩺📊🔍💡📈 + colored badges) — tabs inside a tab on the client page, and a buried tab strip under the
chart on the session page. And "reassessment recommended" now renders in three places. Round 5 gave
us `AgentReportBody`, so the per-agent output no longer needs bespoke tab chrome — it can be plain
stacked sections.

---

## Part A — Flatten `ClientInsights` (client Overview "second row") [feedback #1]

`src/app/components/clients/ClientInsights.js`: remove the internal tab system entirely
(the `TABS` array with emojis, `activeTab` state, the tab `<button>` row, and the `activeTab === …`
gating). Render the agent outputs as **stacked, titled sections** in clinical order:

```jsx
// after reports load into assessment/diagnostic/treatment/progress (keep that logic)
return (
  <div className="space-y-6">
    <Section title="Assessment" summary={assessment?.summary}>
      {assessment ? <AgentReportBody agentType="assessment" payload={ap} /> : <Empty>Assessment generates automatically when a client is created.</Empty>}
    </Section>
    <Section title="Diagnostic Impression" summary={diagnostic?.summary}>
      {diagnostic ? <AgentReportBody agentType="diagnostic" payload={dp} /> : <Empty>Generated automatically after the assessment.</Empty>}
    </Section>
    <Section title="Treatment Plan" summary={treatment?.summary}>
      {treatment ? <AgentReportBody agentType="treatment" payload={tp} /> : <Empty>Generated automatically when you open a scheduled session.</Empty>}
    </Section>
    <Section title="Progress Report" summary={progress?.summary}>
      {progress ? <AgentReportBody agentType="progress" payload={pp} /> : <Empty>Generated automatically after you complete a session.</Empty>}
    </Section>
  </div>
);
```

- `Section` = a small local component: a heading, the optional summary in a calm muted box (drop the
  blue `bg-blue-50` — one neutral style), then children. No emoji, no per-section color.
- `Empty` = muted helper text (also fixes the stale "Run Initial Assessment" copy — see Part E).
- **Remove** the `getRiskColor`/`getStatusColor` rainbow maps if they're now unused (the badges live
  in `AgentReportBody`, which already uses a single `Badge` style). Grep before deleting.
- **Title it "Progress Report"** here — this is the AI narrative, distinct from the charts (Part D).

## Part B — Flatten + reposition `SessionAIInsights` (session view) [feedback #3]

`src/app/components/sessions/SessionAIInsights.js`: same flattening — drop the `TABS`/`activeTab`
chrome, render stacked `Section`s (reuse the same small `Section` component; lift it to
`src/components/ai/Section.jsx` so both import it). Only the four relevant agents here
(assessment/diagnostic/treatment/progress); title the progress one **"Progress Report"**.

Then in `src/app/components/sessions/SessionDetail.js` reorder the AI Insights block so it's
**prominent, not buried under the chart**. Target top-to-bottom order under "AI Insights":
1. `AutoPostSession` generating state (already there) — make sure its label reads clearly, e.g.
   "Writing the session note…", and it sits at the top so the therapist sees the AI is working.
2. `SessionNote` (the draft SOAP note + approve).
3. `SessionAIInsights` (the stacked agent sections).
4. **Measures** card (`MeasuresPanel`) — move **below** the insights, since measures are an action
   the therapist takes, while insights are what they read first. (Today measures sit above insights.)

> The "not obvious the AI is running" issue is fixed by (a) the generating state at the top and
> (b) removing the tab strip that hid output behind a default tab.

## Part C — One reassessment signal, not three [feedback #2, #4]

Reassessment currently renders in three places. Keep exactly one: the calm page-level
`ReassessmentBanner` on the client page (it already shows only when truly flagged — it is **not** dead
code; it returned `null` for the empty case, which is why you saw nothing until Sarah's progress
flagged it).

- **Remove** the `⚠️ Reassessment recommended` block inside `ClientInsights.js` (~L231–234).
- **Remove** the `{p.reassessmentRecommended && <Badge>Reassessment recommended</Badge>}` line from
  `ProgressBody` in `src/components/ai/AgentReportBody.jsx` (~L195).
- Leave `ReassessmentBanner` as-is. Result: the recommendation appears once, calmly, on the client
  page — nowhere else.

## Part D — Resolve the "two Progresses" naming collision [feedback #5]

There are two distinct things both called "Progress"; label them so a clinician instantly knows which
is which:

- The **charts** (PHQ-9/GAD-7 over time, on the client Progress tab via `MeasureTrend`) → these are
  **"Measure Trends."** In `ClientDetail.js`'s Progress tab, add a small heading "Measure Trends"
  above the `MeasuresPanel`/`MeasureTrend` charts and "Risk Over Time" above `ClientAnalytics`.
- The **AI narrative** (Goal Progress, Measure Interpretation, Barriers, …) → **"Progress Report"**
  (retitled in Parts A & B).

The session-page "Progress Report" showing text and no chart is now **expected and labeled** — charts
live on the client's Progress tab; the session shows the narrative report. They're different views of
progress, now named differently.

### Trim the Progress Report sections (the "lots of sections" observation)
In `ProgressBody` (`AgentReportBody.jsx`), lead with what a clinician scans first and de-emphasize the
rest. Reorder to: **Measure Interpretation → Goal Progress → Next Session Focus → Barriers →
Recommendations → Treatment Effectiveness**. Render `Treatment Effectiveness` and `Recommendations`
as smaller/secondary (e.g. muted text), and if `measureInterpretation` is empty show a single muted
line ("No standardized measures recorded for this period.") rather than an empty section. Keep all
fields available — just prioritized. No schema change.

## Part E — Folded-in queued fixes (small, do them here)

1. **Stale copy sweep** [overlaps #1]: replace the remaining pre-refactor instructions —
   - `ClientDetail.js:490` create toast → "✨ Client created. The AI assessment is generating now —
     it'll appear on the Overview shortly."
   - The `Empty` helper texts in Part A already replace the "Run Initial Assessment / Prepare for
     Session / Process Session Results" strings. Grep to confirm none remain:
     `grep -rn "AI Assistant tab\|Run Initial Assessment\|Prepare for Session\|Process Session Results" src` → nothing.
2. **Duplicate "Generate Report" button**: `ClientDetail.js` has two (L773 with the
   `//TODO: fix or remove`, and L854). Keep the intentional one (L854, in the Reports area), delete
   the L773 one in the "Recent Reports" overview block. Remove the TODO comment.
3. **System-option warning fix** (saved earlier): in `src/lib/ai/baseAgent.js`, move the system
   prompt + client block into the `system` option, leaving only the user turn in `messages`:
   ```js
   system: `${system}\n\n${clientBlock}`,
   messages: [{ role: "user", content: requestBlock }],
   ```
4. **AutoWorkflow "Try again"** (saved earlier): add a `retry` to `useEnsureWorkflow` (extract the
   fetch into a `run()` callback, expose `retry: () => run()`), and render a "Try again"
   `Button` in the error branch of `AutoIntake`/`AutoSessionPrep`/`AutoPostSession`.
5. **`ClientAnalytics` → real MBC data** (the lingering `TODO(Round 3)`): the analytics route still
   returns only the `riskTimeline` stub. Now that `getTrend` exists, this is the moment — BUT this is
   bigger than the rest of Part E. **If it balloons, split it into its own commit/round and ship A–D
   first.** Minimum viable version: have `ClientAnalytics` render the existing `riskTimeline` *and*
   the measure trends via the measures API it can already call, under the "Risk Over Time" / "Measure
   Trends" headings from Part D, and drop the `TODO(Round 3)` comment. Don't invent new metrics.

## Acceptance criteria (smoke)

1. Client **Overview**: no inner tab row, no emoji icons; AI output is stacked titled sections
   (Assessment / Diagnostic Impression / Treatment Plan / Progress Report). One neutral visual style.
2. Client **Progress** tab: charts under a "Measure Trends" heading and "Risk Over Time" heading;
   reassessment shows **only** as the page banner (when flagged), nowhere else.
3. **Session** view: AI Insights is visually prominent with a clear generating state at top, draft
   note, then stacked insight sections, then the Measures card **below**. No buried tab strip.
4. "Progress Report" (text) and "Measure Trends" (charts) are distinctly labeled; no user confusion
   about why the session shows text and the client tab shows charts.
5. `grep -rn "AI Assistant tab\|Run Initial Assessment\|Prepare for Session\|Process Session Results" src`
   → nothing. Only one "Generate Report" button. No system-message warning in the server log on an
   agent run. Failed auto-workflows show a working "Try again".
6. `npm run lint` clean.

## Suggested commits

```
refactor(cognicare): flatten ClientInsights + SessionAIInsights into stacked sections (no nested tabs)
refactor(cognicare): reposition session AI Insights above measures; clear generating state
refactor(cognicare): single reassessment signal (page banner only)
refactor(cognicare): name "Measure Trends" vs "Progress Report"; prioritize progress sections
fix(cognicare): stale copy sweep, dedupe Generate Report, system option, auto-workflow retry
```

(If Part E.5 grows, give it its own commit/round: `feat(cognicare): ClientAnalytics on real MBC trends`.)

## Note on clinical feedback

If any of your wife's reactions were about *content quality* — the assessment's clinical soundness,
the SOAP draft's defensibility, whether LIAM's answers were genuinely useful — those are prompt/schema
changes, not this UX round. Send them separately and I'll treat them as their own track.
