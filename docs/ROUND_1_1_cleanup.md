# Round 1.1 — Boot Fix + Report-Plumbing Consolidation

> Hand to Claude Code. Branch `dev`, working dir `products/cognicare`. You have the repo —
> read files as needed; this spec gives intent + authoritative new code, you do the wiring.
> Goal: the app boots and every page that reads AI reports works, AND the over-built report
> plumbing collapses to something readable. Commit as a small series (suggested messages at end).

## Why this round exists

Round 1 renamed the shared `aiReport` fields (`type`→`agentType`, `content`→`summary`+`payload`)
and redesigned the agent payload shapes. Consumers still read the old field names and old shapes,
so `ClientDetail` hard-crashes (`report.type.charAt` on undefined) and insights/analytics render
empty or wrong. While fixing that, we also consolidate the duplicative report plumbing.

## Scope guard (do NOT touch this round)

Subscriptions/Stripe, auth, the `SessionAssistant` widget rebuild, and any shadcn/UI work are
**later dedicated rounds**. Don't refactor them here. Stay in: AI-report read sites, the
`reports`/`ai-reports` plumbing, the `conversational` route, and `baseAgent`'s dead shim.

---

## Part A — Stop the crashes (field migration on AIReport consumers)

Apply these renames **only where the object is an `AIReport`**. Do NOT touch look-alikes:
- `Session.type` (session kind: initial/group/…) — leave alone.
- `Report.type` (the compiled-Report enum, see Part C) — leave alone.
- `template.content`, consent-form content, email/message `content` — leave alone.

Migration rules on AIReport objects:
- `.type` → `.agentType` (and drop any `"conversational"` from AIReport type filters / `$in` lists).
- `.content` → `.payload` for the structured body; `.content.summary` (if any) → `.summary`.
- sort/read `metadata.timestamp` → `createdAt`.

Known read sites (grep `\.type\b`, `\.content\b`, `metadata.timestamp`, `agentType` to find any I missed):

- `src/app/components/clients/ClientDetail.js` — `report.type` (L172, L895) → `report.agentType`;
  `selectedReport.content` (L1033) → `selectedReport.payload`. Guard the label with `?.` so a
  missing field never throws: `(report.agentType ?? "report")`.
- `src/app/components/clients/ClientInsights.js` — `.filter(r => r.type === …)` → `r.agentType`;
  `report?.content` (L120–123) → `report?.payload`; any `metadata.timestamp` sort → `createdAt`.
- `src/app/components/sessions/SessionAIInsights.js` — `.find(r => r.type === …)` (L47–55) →
  `r.agentType`; `…?.content` (L49–58) → `…?.payload`.
- `src/app/api/clients/[id]/ai-reports/route.js` — any `type`/`metadata.timestamp` in the query →
  `agentType`/`createdAt`.
- `src/app/api/clients/[id]/reassessment-status/route.js` — `progressReport.content` → `.payload`;
  the old fields don't exist in the new progress payload, so map:
  `content.recommendReassessment` → `payload.reassessmentRecommended` (boolean);
  drop `reassessmentRationale` (no equivalent) — fall back to the first item of
  `payload.recommendations ?? []` or an empty string. Sort by `createdAt`.
- `src/app/api/export/route.js` — AIReport reads use `agentType`/`payload`/`summary`.

### analytics route — reduce, don't remap

`src/app/api/clients/[id]/analytics/route.js` scrapes `content.metrics.*`,
`content.goalAchievementStatus`, `content.keyObservations`, `content.primaryDiagnosis` (as an
array), etc. Those shapes are gone. Do **not** rebuild rich analytics here — Round 3 drives
analytics from MBC measure trends. Replace the body with a minimal, correct version:

```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

// Minimal risk-over-time series from assessment reports.
// TODO(Round 3): replace with MBC-driven analytics (PHQ-9/GAD-7 trends via src/lib/mbc/trend.js).
const RISK_SCORE = { none: 0, low: 1, moderate: 2, high: 3, imminent: 4 };

export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;

  await connectDB();
  const assessments = await AIReport.find({ clientId, agentType: "assessment" })
    .sort({ createdAt: 1 }).lean();

  const riskTimeline = assessments.map((r) => ({
    date: r.createdAt,
    level: RISK_SCORE[r.payload?.riskLevel] ?? 0,
    levelText: r.payload?.riskLevel ?? "none",
  }));

  return NextResponse.json({ riskTimeline });
}
```

If `ClientAnalytics.js` consumes fields this no longer returns, trim it to render just
`riskTimeline` (a small line/area chart) and leave a `{/* Round 3: MBC trends */}` placeholder.
Don't fabricate data.

---

## Part B — Kill the conversational landmine + the dead shim

`src/app/api/ai/conversational/route.js` still calls the deprecated shim with `"conversational"`,
which now has no envelope (→ `generateObject` gets `schema: undefined` and throws) and writes the
old field shape the model rejects. It's slated for replacement by LIAM in Round 2. Replace the
whole file with a clean gone-stub:

```js
import { NextResponse } from "next/server";

// The conversational agent is being replaced by LIAM in Round 2 (/api/liam/chat).
// Kept as a stub so any stale caller fails clearly instead of throwing a 500.
export async function POST() {
  return NextResponse.json(
    { error: "The conversational agent has moved. LIAM ships in Round 2 at /api/liam/chat." },
    { status: 410 }
  );
}
```

Then remove the now-orphaned shim from `src/lib/ai/baseAgent.js`: delete the
`createStructuredResponse` export entirely (conversational was its only caller — confirm with a
grep first). Keep the `runAgent` export and the `createAgentStream` NOTE comment.

---

## Part C — Consolidate the report plumbing

Two distinct concepts; keep both but make the distinction obvious. Add a one-line header comment
to each model:

- `src/models/aiReport.js` → `// AIReport: one raw output from a single AI agent run.`
- `src/models/report.js` → `// Report: a therapist-compiled, date-ranged report (draft/completed) aggregating AIReports.`

### C1. Collapse five helpers into one

Delete `src/lib/reports/{assessment,diagnostic,treatment,progress,documentation}.js` (≈380 lines,
near-identical, full of `console.log`, all on the broken `type` field). Replace with one file:

```js
// src/lib/reports/generate.js
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

// Gather the AI agent outputs of one type for a client within a date range.
// Used by POST /api/clients/[id]/reports to compile a saved Report.
export async function gatherAgentReports(agentType, clientId, from, to) {
  await connectDB();
  const start = new Date(from); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(to); end.setUTCHours(23, 59, 59, 999);
  return AIReport.find({
    clientId,
    agentType,
    createdAt: { $gte: start, $lte: end },
  }).sort({ createdAt: -1 }).lean();
}
```

### C2. Delete the five dead per-type routes

These have **zero callers** in the codebase (verified). Delete entirely:
`src/app/api/reports/{assessment,diagnostic,treatment,progress,documentation}/route.js`.

### C3. Simplify the dispatcher

`src/app/api/clients/[id]/reports/route.js` currently imports all five `generate*Report` helpers
and switches on type (L88–105). Rewrite the `POST` so it maps the requested report `type` to an
`agentType` and calls `gatherAgentReports(agentType, clientId, from, to)` **once**, then saves the
`Report` document exactly as before (same `Report` fields: `type`, `startDate`, `endDate`,
`content`, `createdBy`, `status`). Net: one import, no switch. Strip any `console.log`.

### C4. Keep, just de-lint

`src/app/api/reports/route.js` and `src/app/api/reports/[id]/route.js` are used by
`src/app/reports/page.js` — **keep them**. Just migrate any AIReport reads to the new fields and
remove debug logging. Same for `src/app/api/clients/[id]/reports/[reportId]/route.js`.
Check `src/app/api/reports/[id]/sessions/[sessionId]/route.js`: if nothing references it
(grep the app), delete it; otherwise migrate fields.

---

## Part D — Slim the AIReport model (readability)

The `metadata` blob (`priority`, `riskFactor`, `hasProgressData`, `timestamp`) is vestigial and
duplicates `createdAt`. Simplify:

```js
// AIReport: one raw output from a single AI agent run.
import mongoose from "mongoose";

const aiReportSchema = new mongoose.Schema(
  {
    clientId:    { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    agentType:   { type: String, required: true,
      enum: ["assessment", "diagnostic", "treatment", "progress", "documentation"] },
    summary:     { type: String, required: true },
    payload:     { type: mongoose.Schema.Types.Mixed, required: true },
    source:      { type: String, required: true }, // e.g. "agent-v2"
    modelVersion:{ type: String },                 // e.g. "gpt-5.5"
  },
  { timestamps: true }
);

aiReportSchema.index({ clientId: 1, agentType: 1, createdAt: -1 });

export default mongoose.models.AIReport || mongoose.model("AIReport", aiReportSchema);
```

Update `persistReport` in `src/lib/report-utils.js` to write `modelVersion` at top level (drop the
`metadata` object). Grep for any remaining `.metadata` reads on AIReport and remove them.

---

## Acceptance criteria (smoke before final commit)

1. `npm run dev` boots; `npm run lint` clean (ESLint is already a hard error).
2. Open a client that has at least one AIReport: `ClientDetail` renders, no `charAt of undefined`.
   The report list shows the capitalized `agentType`; clicking one shows its `payload` JSON.
3. `ClientInsights` and `SessionAIInsights` populate from `payload` (not blank, no console errors).
4. `GET /api/clients/[id]/analytics` returns `{ riskTimeline: [...] }` with `levelText` from the
   new 5-point scale; `ClientAnalytics` renders it without throwing.
5. `POST /api/clients/[id]/reports` (pick any type) compiles and saves a `Report`; it appears on
   `/clients/[id]/reports` and on `/reports`.
6. `POST /api/ai/conversational` returns **410**, not 500.
7. `grep -rn "createStructuredResponse\|metadata.timestamp\|generateAssessmentReport" src` returns
   nothing. `grep -rn "r.type ===\|report.type" src/app/components` returns nothing.
8. `src/lib/reports/` contains only `generate.js`. `src/app/api/reports/{assessment,diagnostic,
   treatment,progress,documentation}/` are gone.

## Suggested commits

```
fix(cognicare): migrate AIReport read sites to agentType/payload/summary
refactor(cognicare): collapse 5 report helpers + 5 dead routes into one
refactor(cognicare): slim AIReport model; drop vestigial metadata blob
chore(cognicare): stub conversational route (410) + remove dead baseAgent shim
```

## After this: app is bootable and clickable end-to-end → Round 2 (LIAM)

Round 2 adds `/api/liam/chat` (streaming + `liam_threads` memory), the LIAM sheet + Cmd-K, and —
per the clinical-UX decision — has LIAM surface the MBC risk flags and trends. The conversational
stub gets deleted then.
