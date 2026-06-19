# Round 26 — Evolving treatment plan (initial at intake + progress-aware revision)

> Branch `dev`, working dir `cognicare`. Two-part fix: (1) generate an initial treatment plan at
> intake as an editable draft; (2) make the treatment plan a living document that REVISES per session
> using progress, instead of silently regenerating from scratch. Keep version history. Mirrors the
> SOAP-note draft/approve pattern.

## Why (verified current behavior)
- Treatment only fires on session-prep; intake leaves it empty (clinically wrong — you can plan from
  an intake).
- Session-prep calls `plan({ clientId })` which **creates a fresh report each time** — the prompt says
  "building" a plan, with no notion of revising the prior one. So plans are regenerated, not evolved.
- `AutoSessionPrep` checks for a treatment report **scoped to sessionId** — so a client-level intake
  plan (no sessionId) wouldn't satisfy it, causing a duplicate plan on first session. Must fix.
- **Good news:** `buildClientBlock` already feeds the last 8 reports + measure trends into agent
  context — so the agent already *sees* the prior plan + progress; it just isn't told to revise.

## Design: one evolving plan, versioned
- **Intake** generates v1 (client-level, no sessionId, status "draft").
- **Each session-prep** produces a **revision** that takes the latest plan + progress into account,
  links to the prior via `supersedes`, increments `version`. The latest approved/active plan is "the
  plan"; prior versions are retained as history.
- Clinician reviews/edits/approves drafts (intake v1 and each revision) like SOAP notes.

## 1. Schema — add revision fields
`src/lib/ai/schemas.js`, extend `treatmentPayload`:
```js
export const treatmentPayload = z.object({
  approach: z.string().describe("Primary evidence-based modality"),
  goals: z.array(z.object({ goal: z.string(), measurable: z.string(), targetTimeframe: z.string() })),
  interventions: z.array(z.string()),
  homework: z.array(z.string()),
  referrals: z.array(z.string()),
  reviewCadence: z.string(),
  changeSummary: z.string().describe("What changed from the prior plan and why; empty for the initial plan"),
});
```
`src/models/aiReport.js` — add (treatment uses them; others leave unset):
```js
version:    { type: Number, default: 1 },
supersedes: { type: mongoose.Schema.Types.ObjectId, ref: "AIReport" }, // prior treatment report
```

## 2. Treatment agent — revision-aware
`src/lib/ai/agents/treatment.js`: accept the prior plan + revision flag:
```js
export async function plan({ clientId, priorPlan = null }) {
  const clientBlock = await buildClientBlock(clientId);
  const mode = priorPlan
    ? `REVISE the existing treatment plan below in light of the latest progress and session data. ` +
      `Keep what's working, change what isn't, and fill changeSummary with what changed and why.\n\n` +
      `EXISTING PLAN:\n${JSON.stringify(priorPlan.payload, null, 2)}`
    : `Create the initial treatment plan. Leave changeSummary empty.`;
  const requestBlock = buildRequestBlock("Treatment plan request", { clientId, instructions: mode });
  return runAgent({ agentType: "treatment", clientBlock, requestBlock });
}
```
`prompts/treatment.md`: add a line — "If revising an existing plan, preserve effective elements,
adjust what the progress data shows isn't working, and summarize the change in changeSummary. If
creating the initial plan, changeSummary is empty."

## 3. Orchestrator — intake creates v1; pre-session revises
`src/lib/ai/orchestrator.js`:
```js
if (type === "intake") {
  const a = await assess({ clientId }); await save(a);
  const d = await diagnose({ clientId, assessment: a }); await save(d);
  const t = await plan({ clientId });                       // v1, no prior
  await save({ ...t, status: "draft", version: 1 });
  return { assessment: a, diagnostic: d, treatment: t };
}
if (type === "pre-session") {
  const prior = await latestTreatment(clientId);            // most recent treatment report
  const t = await plan({ clientId, priorPlan: prior });     // revise
  await save({ ...t, status: "draft",
    version: (prior?.version ?? 0) + 1, supersedes: prior?._id });
  return { treatment: t };
}
```
Add a small `latestTreatment(clientId)` helper (query AIReport agentType=treatment, sort version/
createdAt desc, limit 1). Persist `sessionId` on the pre-session revision as today (keep that link)
**and** the version chain.

## 4. AutoSessionPrep — don't duplicate; revise once per session
`src/components/ai/AutoSessionPrep.jsx`: the eligibility check currently looks for a treatment report
scoped to this sessionId. Keep that (so each session gets one revision), BUT the FIRST session after
intake should produce a revision of the intake v1 — which it will, since no sessionId-scoped report
exists yet for this session. Confirm: after running, the new revision is saved with this `sessionId`
so it won't re-fire. (The intake v1 has no sessionId, so it never blocks a session revision — correct.)

## 5. Overview — one plan, draft/approve, history
`ClientInsights` treatment section (via `AgentReportBody`): show the **latest** treatment report
(highest version). If `status === "draft"`: "Draft v{n} — review & approve" badge, editable fields,
**Approve** button -> `PATCH` status approved. If a `changeSummary` exists (revisions), show it
prominently ("What changed this revision: …"). Optionally a small "v{n}" + link/expander to view prior
versions (read-only) — nice but not required for v1.

Add `GET`/`PATCH src/app/api/clients/[id]/treatment/route.js` (or extend the existing ai-report update
path): PATCH edits payload and/or sets status approved; scope-guarded via `clientScope`; audited.

## 6. AutoIntake label
Update to "…assessment, diagnosis, and initial treatment plan…".

## Acceptance
1. New client w/ intake → assessment + diagnosis + **initial treatment plan (draft v1)** on Overview,
   no session needed.
2. Opening/prepping a session → a **revised** plan (v2, v3…) that references progress, with a
   `changeSummary` of what changed — NOT a from-scratch duplicate. Version increments; supersedes links.
3. Only ONE current plan shown (latest version); drafts are editable + approvable; no double-plan.
4. Prior versions retained (history), even if not surfaced richly in v1.
5. Progress/documentation still session-gated. `clientScope` + audit on treatment edits/approve.
6. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): evolving treatment plan — initial at intake + progress-aware revision w/ versioning
```

## Note
This makes treatment a living clinical document (the clinically-correct model) rather than a
regenerated snapshot. Watch token cost: revision passes include the prior plan + the 8-report context
— fine on real models, and you're on nano during testing anyway.
