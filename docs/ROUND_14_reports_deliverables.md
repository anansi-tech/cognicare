# Round 14 — Reports as real deliverables (synthesis + PDF export) + cleanup

> Branch `dev`, working dir `products/cognicare`. Two halves: (A) make a compiled Report an actual
> exportable clinical document — a date-ranged **narrative synthesis** of the underlying agent
> outputs, exported as a real **PDF** (like consent now does), suitable to send to a referring
> provider/insurer/client; and (B) clean up the redundant entry points, routes, and viewers. Reuse
> `pdf-lib` + the consent-PDF pattern from Round 13.

## Why (the conceptual gap)

Today a "Report" just gathers existing AIReports of one type in a date range and dumps them; viewing
is `window.print()` of a web page. That adds little — the agent outputs are already viewable in the
chart. A real compiled report's value is: spans a period, **synthesizes** into clean narrative prose,
and is an **exportable document for an external audience**. This round delivers that. (Decided with
owner: reports ARE sent outside the practice — to referring providers etc. — so synthesis + PDF is
the point, not gold-plating.)

---

## Part A — Real reports

### A1. A synthesis step (turn gathered agent outputs into a narrative)

Add a report-synthesis agent. The existing `gatherAgentReports` pulls the raw AIReports in range;
now feed them to the clinical model to produce a clean, audience-appropriate narrative.

`prompts/report.md` (new):
```md
You are a licensed clinician writing a formal clinical report to be shared with an external audience
(e.g. a referring physician, care team, or — where appropriate — the client). You are given a set of
this client's AI-generated clinical records (assessments, diagnoses, treatment plans, progress
evaluations, session documentation) over a date range.

Synthesize them into a coherent, professional report. Principles:
- Write in clinical narrative prose, not bullet dumps or raw data. Third person, professional register.
- Cover: the period and purpose, presenting concerns, relevant diagnostic impressions, treatment
  approach and goals, progress over the period (reference measure trends if present), and current
  status / recommendations.
- Synthesize across the records — note change over time, don't just concatenate.
- Be accurate to the source records; do not invent. If the records are sparse, say so plainly.
- This is clinical decision support / documentation for a licensed professional; it is not a
  standalone diagnosis.
```

`src/lib/ai/agents/report.js`:
```js
import { generateText } from "ai";
import { openai, MODELS } from "@/lib/ai/client";
import { loadPrompt } from "@/lib/ai/prompts";

// Synthesize gathered AIReports + client context into a narrative report body (markdown/plain prose).
export async function synthesizeReport({ reportType, client, agentReports, from, to }) {
  const system = await loadPrompt("report");
  const context = [
    `Report type: ${reportType}. Period: ${from} to ${to}.`,
    `Client: ${client.name}, age ${client.age ?? "n/a"}.`,
    `Records:\n${JSON.stringify(agentReports.map(r => ({ agentType: r.agentType, summary: r.summary, payload: r.payload, date: r.createdAt })), null, 2)}`,
  ].join("\n\n");
  const { text } = await generateText({
    model: openai(MODELS.clinical),
    system,
    messages: [{ role: "user", content: context }],
  });
  return text; // narrative prose
}
```

### A2. Report generation stores the synthesized narrative

`src/app/api/clients/[id]/reports/route.js` POST: after `gatherAgentReports`, call
`synthesizeReport(...)` and store the **narrative** as the report body, alongside the source records
for traceability. Change `Report.content` to hold `{ narrative, sources }` (narrative = the prose,
sources = the gathered AIReport ids/summaries). Scope-guard with `clientScope` (the report is about a
client — a clinician can only report on clients they can see). **Audit** report creation.

> If there are **no** agent reports in the range, return a clear error ("No clinical records in this
> period to compile") rather than generating an empty narrative. Don't synthesize from nothing.

### A3. Report type — match reality

The model enum has 5 types; the UI offers 3. Decide the real set. Recommend: **progress, treatment,
assessment, diagnostic, documentation** all valid (they map to agent types), and the UI offers all of
them with clear labels. Or, simpler and more honest about what people actually send out: offer
**Progress Summary**, **Treatment Summary**, **Assessment Summary** in the UI and keep the enum
permissive. Pick one; don't leave UI and model mismatched.

### A4. PDF export (the deliverable)

Reuse the Round 13 pattern. `src/lib/report-pdf.js` (pdf-lib): render the narrative into a clean,
professional PDF — practice name header, client name, report type, date range, the narrative body
(paginated), a generated-on footer, and a "generated with AI clinical decision support; reviewed by
{clinician}" line for honesty. `GET /api/clients/[id]/reports/[reportId]/pdf` → scope-checked →
streams the PDF (or uploads to storage and returns a signed URL, matching consent). Replace
`window.print()` with a **Download PDF** button.

> Like the SOAP note, consider a **draft → reviewed** posture: the synthesized report is AI-generated,
> so the clinician should be able to read/edit the narrative before exporting/sending. Minimum: show
> the narrative in an editable textarea on the report page, save edits, then export. (The model
> already has draft/completed status — use it: synthesized = draft; clinician approves → completed;
> only completed reports export, or watermark drafts.) Keep this simple but present — never let an
> unreviewed AI report leave the building as final.

## Part B — Cleanup (remove what's redundant/dead)

### B1. One generate entry point, not three
Currently: a **modal** in `ClientDetail.js` (L890+), a dedicated **`/clients/[id]/reports/new`**
page, and the **list page** linking to `new`. Keep **one**. Recommend: keep the dedicated
`/clients/[id]/reports/new` page (room for type + range + preview), and **remove the duplicate modal**
from `ClientDetail` — replace the chart's "Generate Report" button with a link to `new`. (Or keep the
modal and delete the page — but the page is the better home for an editable preview. Pick the page.)
Result: the chart's Reports area has one "New report" action → the new-report flow.

### B2. One viewer, not two
`[reportId]/page.js` and `[reportId]/view/page.js` (with its own `view/layout.js`) both exist; the
**`/view`** one is what's linked from ClientDetail and the global list. Keep `/view` (it's the
clean/printable layout), **delete** the plain `[reportId]/page.js` if nothing links it (the
`/clients/[id]/reports` list links to `[reportId]` without `/view` — repoint that to `/view`), or
merge them into one. End state: a single report viewer with the **Download PDF** button.

### B3. Delete the dead route
`src/app/api/clients/[id]/sessions/[sessionId]/reports/route.js` — **zero callers** (verified).
Delete it.

### B4. Reconcile the two API surfaces
`/api/reports` + `/api/reports/[id]` (global list/get/delete, used by `/reports` page) and
`/api/clients/[id]/reports` (per-client generate/list). Both legitimately exist (global reports
inbox vs per-client), but ensure **both are practice+scope guarded** (global `/api/reports` must
filter by `clientScope`/practice so a clinician's reports list only shows reports for clients they can
see — verify it does; today it filters by practiceId only, which would leak other clinicians' client
reports). Fix `/api/reports` to honor `visibleClientIds(user)`.

> This is the same confidentiality rule as everywhere else: a clinician sees reports only for clients
> in their scope; owner sees all.

## Acceptance criteria

1. Generating a report synthesizes a **narrative** (prose, not raw JSON) from the period's agent
   outputs; empty period → clear "no records" error, not an empty report.
2. The report viewer shows the narrative, lets the clinician **edit** it (draft), and **Download
   PDF** produces a clean professional document (practice header, client, range, narrative,
   AI-assisted disclosure). `window.print()` is gone.
3. Only **one** generate entry point (the `new` page) and **one** viewer (`/view`). The duplicate
   modal and orphan viewer are removed; `sessions/[sessionId]/reports` route deleted.
4. **Confidentiality:** `/api/reports` (global list) and per-client report routes are scoped — a
   clinician sees reports only for clients they can see; owner sees all. Verify a clinician can't GET
   another clinician's client report.
5. UI report types match the model enum (no 3-vs-5 mismatch). Report creation is **audited**.
6. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
feat(cognicare): report synthesis agent — narrative from gathered agent outputs
feat(cognicare): reports store narrative + sources; scope-guarded + audited generation
feat(cognicare): report PDF export (pdf-lib) + editable draft-before-export
refactor(cognicare): single report generate entry (new page) — remove duplicate modal
refactor(cognicare): single report viewer (/view) — delete orphan viewer + dead session-reports route
fix(cognicare): scope global /api/reports by visible clients (confidentiality)
```

## Next flow

After reports: **scheduling & calendar** — read the whole flow, judge against practice norms (recurring
appointments, reminders, no-show handling), streamline.
