# Round 4a — Self-Driving Agents + Draft Note Approval

> Hand to Claude Code. Branch `dev`, working dir `products/cognicare`. You have the repo.
> Goal: the therapist stops pushing "run the AI" buttons. Agents fire automatically at the natural
> moments; the therapist only supplies observations and **reviews** output. The post-session SOAP
> note is produced as a **draft** the therapist edits and approves before it's official.
> (IA/tab consolidation is Round 4b — don't reorganize tabs here.)

## The principle

Today every agent run is a manual button inside the `AIWorkflow` widget, which only appears after a
session is marked documented. That contradicts the product premise. New rule: **agents run on the
natural event, surfaced as a "generating…" state, never as a button.**

| Event | What fires | Where it surfaces |
| --- | --- | --- |
| Client created / first viewed with no assessment | intake (assessment → diagnostic) | Client page |
| Scheduled session first viewed with no treatment | pre-session (treatment) | Session page |
| Session completed + documented, no note yet | post-session (progress → documentation **draft**) | Session page |

No new model fields for status — the trigger is "output missing?", guarded against double-fire by a
ref. The orchestrator and routes from Round 1 are reused as-is.

---

## Part 1 — Long-running route config

`src/app/api/ai/agent-workflow/route.js`: add `export const maxDuration = 300;` (two sequential
`gpt-5.5` reasoning calls can take a while). Note: this requires a Vercel plan that allows it
(Fluid/Pro up to 300s; Hobby caps at 60s). If you're on Hobby and intake times out, the fallback is
to move these to a background job later — flag it, don't silently fail. Keep `runtime = "nodejs"`.

---

## Part 2 — The "ensure" hook (fire-if-missing, once)

### `src/hooks/useEnsureWorkflow.js`

```js
"use client";
import { useEffect, useRef, useState } from "react";

// Fires a workflow exactly once when `shouldRun` is true and its output is missing.
// `shouldRun` is computed by the caller (e.g. "client has no assessment report yet").
export function useEnsureWorkflow({ shouldRun, type, clientId, sessionId, onDone }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const fired = useRef(false);

  useEffect(() => {
    if (!shouldRun || fired.current) return;
    fired.current = true;
    setGenerating(true);
    fetch("/api/ai/agent-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, clientId, sessionId }),
    })
      .then((r) => { if (!r.ok) throw new Error("Workflow failed"); return r.json(); })
      .then(() => onDone?.())
      .catch((e) => setError(e.message))
      .finally(() => setGenerating(false));
  }, [shouldRun, type, clientId, sessionId, onDone]);

  return { generating, error };
}
```

Usage pattern in a page/component:
```jsx
const hasAssessment = reports.some((r) => r.agentType === "assessment");
const { generating } = useEnsureWorkflow({
  shouldRun: !loadingReports && !hasAssessment,
  type: "intake",
  clientId,
  onDone: refetchReports,
});
// render <GeneratingState label="Analyzing intake — building assessment and diagnosis…" /> while generating
```

A small shared `GeneratingState` component (spinner + label) lives in
`src/components/ai/GeneratingState.jsx`. Use it everywhere an agent is running so the experience is
consistent — calm, single-line, e.g. "Analyzing intake…", "Preparing your session…",
"Writing the session note…".

---

## Part 3 — Wire the three triggers

**Intake — `ClientDetail.js`:** after the client's reports load, if there's no `assessment` report,
run `useEnsureWorkflow({ type: "intake", clientId })` and show the generating state in the place the
assessment/diagnosis will appear. On `onDone`, refetch reports so insights populate. This is the
moment the product proves itself — make the copy and the loading state feel intentional, not like a
spinner stuck on a missing feature.

**Pre-session — `SessionDetail.js`:** when the session `status` is `scheduled` and there's no recent
`treatment` report, run `type: "pre-session"`. Surface the prep quietly ("Preparing your session…").
Don't block the rest of the page.

**Post-session — `SessionDetail.js`:** when the session is `completed` **and** `documented` and there
is no `documentation` report for it yet, run `type: "post-session"`. This produces the progress
report and the **draft** note (Part 4).

> The orchestrator already persists each report. The page just needs to refetch after `onDone`.

---

## Part 4 — Draft note (documentation) review + approval

The post-session documentation note must be a **draft** the therapist reads, edits, and approves —
clinicians never want AI documentation silently finalized.

### Model: `src/models/aiReport.js`
Add an optional status used **only by documentation**:
```js
status: { type: String, enum: ["draft", "approved"] }, // documentation notes only; others leave unset
```

### Persist as draft: `src/lib/report-utils.js`
In `persistReport`, set `status: agentType === "documentation" ? "draft" : undefined`.

### Session-scoped note endpoint: `src/app/api/sessions/[id]/note/route.js`
```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

// GET: the documentation note for this session. PATCH: edit SOAP fields and/or approve.
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = await params;
  await connectDB();
  const note = await AIReport.findOne({ sessionId, agentType: "documentation" })
    .sort({ createdAt: -1 }).lean();
  return NextResponse.json(note ?? null);
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: sessionId } = await params;
  const { soap, status } = await req.json();
  await connectDB();
  const note = await AIReport.findOne({ sessionId, agentType: "documentation" }).sort({ createdAt: -1 });
  if (!note) return NextResponse.json({ error: "No note for this session" }, { status: 404 });
  if (soap) note.payload = { ...note.payload, soap };
  if (status === "approved") note.status = "approved";
  await note.save();
  return NextResponse.json({ id: note._id, status: note.status, payload: note.payload });
}
```

### UI: `src/components/sessions/SessionNote.jsx`
On the session page, render the SOAP note. If `status === "draft"`: editable S/O/A/P textareas, a
clear "Draft — not yet in the record" badge, and an **Approve note** button (PATCH `status:"approved"`,
saving any edits first). If `approved`: read-only, with an "Approved" badge and a small "Edit" that
flips it back to draft. Keep it shadcn (`Card`, `Textarea`, `Button`, `Badge`).

```jsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FIELDS = [["subjective","Subjective"],["objective","Objective"],["assessment","Assessment"],["plan","Plan"]];

export function SessionNote({ sessionId }) {
  const [note, setNote] = useState(null);
  const [soap, setSoap] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch(`/api/sessions/${sessionId}/note`).then((r) => r.json()).then((n) => {
      setNote(n); setSoap(n?.payload?.soap ?? null);
    });
  useEffect(() => { load(); }, [sessionId]);

  if (!note) return null; // post-session not run yet — the GeneratingState covers that moment
  const draft = note.status === "draft";

  const save = async (approve) => {
    setSaving(true);
    await fetch(`/api/sessions/${sessionId}/note`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soap, status: approve ? "approved" : undefined }),
    });
    setSaving(false); load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Session note</CardTitle>
        <Badge variant={draft ? "secondary" : "default"}>{draft ? "Draft — not in record" : "Approved"}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {draft ? (
              <Textarea value={soap?.[key] ?? ""} rows={3}
                onChange={(e) => setSoap((s) => ({ ...s, [key]: e.target.value }))} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{soap?.[key]}</p>
            )}
          </div>
        ))}
        {draft && <Button onClick={() => save(true)} disabled={saving}>{saving ? "Saving…" : "Approve note"}</Button>}
      </CardContent>
    </Card>
  );
}
```

---

## Part 5 — Retire the manual trigger UI

The triggers are automatic now, so the all-in-one `AIWorkflow` widget and its context are obsolete:

- Delete `src/app/components/clients/AIWorkflow.js` (its three buttons are replaced by the auto-triggers).
- Delete `src/app/context/AIWorkflowContext.js` and remove `AIWorkflowProvider` from `src/app/providers.js`.
  Update `SessionAIInsights.js` and `SessionPrepView.js` to drop `useAIWorkflow` — they read reports
  directly (the data's already persisted; fetch the client's reports like `ClientInsights` does).
- The **reassessment recommendation** the widget used to show as a button context becomes a **passive
  banner**: keep the `GET /api/clients/[id]/reassessment-status` call, and if
  `reassessmentRecommended` is true, show a calm banner on the client page ("A reassessment is
  recommended before the next session") — no button; the next pre-session run already reassesses when
  flagged (pass `shouldReassess` through the pre-session trigger if you want, or just let the
  assessment re-run as part of intake-on-reassessment later). Keep it informational.

Grep after: `grep -rn "AIWorkflow\|useAIWorkflow" src` → nothing.

---

## Acceptance criteria (smoke)

1. Create a client with an intake note → land on the client page → it shows "Analyzing intake…" then,
   without any click, populates assessment + diagnosis. Refreshing mid-run doesn't start a second run
   (ref guard); refreshing after completion shows results, no re-run.
2. Open a brand-new **scheduled** session → "Preparing your session…" → treatment/prep appears, no button.
3. Mark a session completed with notes (documented) → "Writing the session note…" → a **Draft** note
   appears with editable S/O/A/P and an Approve button. No "Process Session Results" button anywhere.
4. Edit a draft field, click Approve → badge flips to "Approved", fields become read-only, edits persisted.
   `GET /api/sessions/[id]/note` shows `status:"approved"`.
5. `grep -rn "AIWorkflow\|useAIWorkflow" src` → nothing. `npm run lint` clean.
6. LIAM still works (its context is independent of the deleted AIWorkflow context).

## Suggested commits

```
feat(cognicare): useEnsureWorkflow hook + GeneratingState; maxDuration on workflow route
feat(cognicare): auto-run intake / pre-session / post-session on the relevant page
feat(cognicare): draft SOAP note — status field, session note endpoint, review+approve UI
refactor(cognicare): delete AIWorkflow widget + context; reassessment becomes a passive banner
```

## Round 4b preview (next)

Information architecture: collapse the client page's seven tabs to ~five (Overview folds in insights;
Progress merges measures + analytics; Sessions; Reports; Billing & Consent), surface
`MeasuresPanel` (with `sessionId`) inside the session page so measures are administered in the
encounter, and drop the redundant `moodRating` from the session form. After 4b I'll write the fresh
end-to-end test against the clean flow and we smoke-test together.
