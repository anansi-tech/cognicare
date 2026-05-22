# Round 1 — Agent Core + Measurement-Based Care Foundation

> Hand this whole file to Claude Code. It is self-contained. Work on branch `dev`.
> Commit at the end as one logical chunk: `feat(ai): unified agent core + MBC foundation`.
> Scope decision from the owner: clinical UX is **in** for this rebuild, so MBC is built into
> the schemas now rather than retrofitted later.

## Goal

Replace the six near-duplicate `.passthrough()` schemas, the `gpt-3.5-turbo` `baseAgent`, the
inline prompts, and the HTTP-fan-out `agent-workflow` with:

1. A single OpenAI client + model registry (current-gen models).
2. One `ReportEnvelope` (per-agent envelope + discriminated union for storage).
3. Externalized markdown prompts that contain **no JSON schema** (Structured Outputs handles format).
4. An **in-process** orchestrator (one round-trip, no `fetch()` between own routes, no cookie forwarding).
5. Five thin specialist agent modules.
6. **Measurement-Based Care foundation**: PHQ-9 + GAD-7 instrument fixtures, scoring, a
   `MeasureAdministration` model, and a trend helper — wired so the Progress agent reasons over
   real longitudinal scores and the PHQ-9 item-9 suicidal-ideation signal flows into risk.

**Out of scope this round (do not touch):** LIAM / `conversational` route (Round 2), MBC capture
UI and trend charts (Round 3), pricing rip-out, Auth.js v5, field-level encryption, `aiReport`
discriminator, shadcn/UI swap. Leave `src/app/api/ai/conversational/route.js` and
`src/lib/ai/baseAgent.js`'s `createAgentStream` **in place** — Round 2 repurposes them.

## Models (pin these — the plan's gpt-4.1/gpt-4o-mini are two generations stale)

- `clinical` → **`gpt-5.5`** (specialists; later LIAM). Best clinical reasoning + structured outputs.
- `background` → **`gpt-5.4-mini`** (session-title autogen, summaries, digests — added in later rounds).

**Compliance gate (blocking, non-code):** the OpenAI BAA must be in place and Zero-Data-Retention
enabled on the API org **before any real client PHI** is sent through these agents. Until then,
test only with synthetic clients. Put a one-line `// PHI GATE:` comment at the top of `client.js`
noting this. Do not skip.

---

## Files to CREATE

```
prompts/assessment.md
prompts/diagnostic.md
prompts/treatment.md
prompts/progress.md
prompts/documentation.md
src/lib/ai/client.js
src/lib/ai/schemas.js            # REPLACES the old one (see "Files to REPLACE")
src/lib/ai/prompts.js
src/lib/ai/baseAgent.js          # REPLACES the old one
src/lib/ai/orchestrator.js
src/lib/ai/context.js
src/lib/ai/agents/assessment.js
src/lib/ai/agents/diagnostic.js
src/lib/ai/agents/treatment.js
src/lib/ai/agents/progress.js
src/lib/ai/agents/documentation.js
src/data/instruments/phq9.json
src/data/instruments/gad7.json
src/lib/mbc/instruments.js
src/lib/mbc/score.js
src/lib/mbc/trend.js
src/models/measureAdministration.js
```

## Files to REPLACE / EDIT

- `src/lib/ai/schemas.js` — full replace (content below).
- `src/lib/ai/baseAgent.js` — full replace (content below). Keep the export name
  `createStructuredResponse` as a thin deprecated shim that calls `runAgent` so nothing breaks
  mid-round; mark `@deprecated`.
- `src/models/aiReport.js` — edit: rename field `type` → `agentType` (same enum **minus**
  `conversational`, which Round 2 re-adds for LIAM), replace `content` with two fields
  `summary: String` and `payload: Mixed`, keep `source`, keep `metadata`. Leave it a plain schema
  (the discriminator is a later DB-hardening round). Add index `{ clientId: 1, agentType: 1, createdAt: -1 }`.
- `src/app/api/ai/{assessment,diagnostic,treatment,progress,documentation}/route.js` — replace each
  body with the thin handler pattern below.
- `src/app/api/ai/agent-workflow/route.js` — **delete the 548-line fan-out** and replace with a thin
  handler that calls `orchestrator.runWorkflow(...)`. (Keep the path for now; a later round renames
  it to `/api/ai/workflow`.)

## Files to DELETE

- none this round. (`conversational` and `createAgentStream` survive for Round 2.)

---

## Artifact contents

### `src/lib/ai/client.js`

```js
// PHI GATE: OpenAI BAA + Zero-Data-Retention must be enabled on the org before real client
// PHI is sent to these models. Until confirmed, use synthetic test clients only.
import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Single source of truth for model selection. Bump here, nowhere else.
export const MODELS = {
  clinical: "gpt-5.5",       // specialists + (Round 2) LIAM
  background: "gpt-5.4-mini", // titles, summaries, digests (later rounds)
};
```

### `src/lib/ai/schemas.js` (full replace)

```js
import { z } from "zod";

// ---- Shared vocab ----------------------------------------------------------
// Collapsed from the old 9-value soup to a clean ordinal clinical scale.
// "imminent" means an active safety concern requiring immediate action.
export const RiskLevel = z.enum(["none", "low", "moderate", "high", "imminent"]);

const Confidence = z.enum(["low", "moderate", "high"]);

const DiagnosisCandidate = z.object({
  code: z.string().describe("ICD-10 or DSM-5-TR code, e.g. F32.1"),
  name: z.string(),
  confidence: Confidence,
  criteriaMet: z.array(z.string()),
  rationale: z.string(),
});

// ---- Per-agent payloads ----------------------------------------------------
export const assessmentPayload = z.object({
  riskLevel: RiskLevel,
  primaryConcerns: z.array(z.string()),
  riskFactors: z.array(z.string()),
  protectiveFactors: z.array(z.string()),
  recommendedInstruments: z.array(z.string())
    .describe("Standardized measures to administer, e.g. PHQ-9, GAD-7, PCL-5"),
  clinicalObservations: z.string(),
  immediateAttention: z.array(z.string())
    .describe("Items needing same-day clinical action; empty array if none"),
  suggestedNextSteps: z.array(z.string()),
});

export const diagnosticPayload = z.object({
  primaryDiagnosis: DiagnosisCandidate,
  differentials: z.array(DiagnosisCandidate),
  ruleOut: z.array(z.string()),
  comorbidities: z.array(DiagnosisCandidate),
  culturalConsiderations: z.array(z.string()),
  clinicalJustification: z.string(),
});

export const treatmentPayload = z.object({
  approach: z.string().describe("Primary evidence-based modality, e.g. CBT, DBT, ACT"),
  goals: z.array(z.object({
    goal: z.string(),
    measurable: z.string().describe("How progress is measured, ideally tied to an instrument"),
    targetTimeframe: z.string(),
  })),
  interventions: z.array(z.string()),
  homework: z.array(z.string()),
  referrals: z.array(z.string()),
  reviewCadence: z.string().describe("When to re-administer measures / reassess"),
});

export const progressPayload = z.object({
  goalProgress: z.array(z.object({
    goal: z.string(),
    status: z.enum(["not-started", "emerging", "progressing", "met", "regressed"]),
    notes: z.string(),
  })),
  // MBC: the agent INTERPRETS the trend it is given in context. It does not invent scores.
  measureInterpretation: z.array(z.object({
    instrumentId: z.string(),
    latestScore: z.number(),
    previousScore: z.number().nullable(),
    direction: z.enum(["improved", "worsened", "unchanged", "insufficient-data"]),
    reliableChange: z.boolean()
      .describe("True if change exceeds the instrument's reliable-change threshold"),
    interpretation: z.string(),
  })),
  treatmentEffectiveness: z.string(),
  barriers: z.array(z.string()),
  reassessmentRecommended: z.boolean(),
  recommendations: z.array(z.string()),
  nextSessionFocus: z.string(),
});

export const documentationPayload = z.object({
  soap: z.object({
    subjective: z.string(),
    objective: z.string(),
    assessment: z.string(),
    plan: z.string(),
  }),
  measuresAdministered: z.array(z.object({
    instrumentId: z.string(),
    score: z.number(),
    severityBand: z.string(),
  })).describe("Echo of instruments scored this session; empty if none"),
  riskStatement: z.string().describe("Explicit risk documentation for the record"),
  followUp: z.array(z.string()),
  cptHint: z.string().optional().describe("Suggested CPT/service code, advisory only"),
});

// ---- Envelope --------------------------------------------------------------
function envelope(agentType, payload) {
  return z.object({
    agentType: z.literal(agentType),
    summary: z.string()
      .describe("2-3 sentence clinical summary: headline status, key change, top priority."),
    payload,
  });
}

export const ENVELOPES = {
  assessment: envelope("assessment", assessmentPayload),
  diagnostic: envelope("diagnostic", diagnosticPayload),
  treatment: envelope("treatment", treatmentPayload),
  progress: envelope("progress", progressPayload),
  documentation: envelope("documentation", documentationPayload),
};

// Discriminated union for persistence-layer validation.
export const ReportEnvelope = z.discriminatedUnion("agentType", [
  ENVELOPES.assessment,
  ENVELOPES.diagnostic,
  ENVELOPES.treatment,
  ENVELOPES.progress,
  ENVELOPES.documentation,
]);

export const AGENT_TYPES = Object.keys(ENVELOPES);
```

### `src/lib/ai/prompts.js`

```js
import { readFile } from "node:fs/promises";
import path from "node:path";

const cache = new Map();

// Node runtime only (specialists run on Node). LIAM/edge handles prompts differently in Round 2.
export async function loadPrompt(name) {
  if (cache.has(name)) return cache.get(name);
  const file = path.join(process.cwd(), "prompts", `${name}.md`);
  const text = await readFile(file, "utf8");
  cache.set(name, text);
  return text;
}
```

### `src/lib/ai/baseAgent.js` (full replace)

```js
import { generateObject } from "ai";
import { openai, MODELS } from "./client";
import { ENVELOPES } from "./schemas";
import { loadPrompt } from "./prompts";

/**
 * Run one specialist agent. Returns a validated { agentType, summary, payload } envelope.
 * Prompt ordering is static-first for OpenAI prefix caching:
 *   system prompt (static) -> client context block (semi-static) -> request tail (dynamic).
 */
export async function runAgent({ agentType, clientBlock, requestBlock, model = MODELS.clinical }) {
  const system = await loadPrompt(agentType);
  const schema = ENVELOPES[agentType];

  const { object } = await generateObject({
    model: openai(model),
    schema,
    schemaName: `${agentType}_report`,
    messages: [
      { role: "system", content: system },
      { role: "system", content: clientBlock },   // cacheable per-client prefix
      { role: "user", content: requestBlock },     // per-request tail
    ],
  });

  return object;
}

/** @deprecated shim so old call sites don't break mid-round. Remove after routes are migrated. */
export async function createStructuredResponse(messages, _functions, agentType = "assessment") {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
  return runAgent({ agentType, clientBlock: system, requestBlock: user });
}

// NOTE: createAgentStream intentionally NOT defined here yet — Round 2 (LIAM) adds streaming.
```

### `src/lib/ai/context.js`

```js
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";
import { getTrend } from "@/lib/mbc/trend";

const j = (label, obj) => `## ${label}\n${JSON.stringify(obj, null, 2)}`;

/** Semi-static per-client block: identity, history, recent reports, measure trends. */
export async function buildClientBlock(clientId, { instrumentIds = ["phq9", "gad7"] } = {}) {
  await connectDB();
  const client = await Client.findById(clientId).lean();
  if (!client) throw new Error("Client not found");

  const recentSessions = await Session.find({ clientId }).sort({ date: -1 }).limit(8).lean();
  const recentReports = await AIReport.find({ clientId }).sort({ createdAt: -1 }).limit(8).lean();
  const trends = {};
  for (const id of instrumentIds) trends[id] = await getTrend(clientId, id, 6);

  return [
    j("Client", client),
    j("Recent Sessions (newest first)", recentSessions),
    j("Recent AI Reports (newest first)", recentReports),
    j("Measure Trends (oldest -> newest)", trends),
  ].join("\n\n");
}

export function buildRequestBlock(label, data) {
  return `## ${label}\n${JSON.stringify(data, null, 2)}`;
}
```

### Specialist agent modules (all five follow this shape)

`src/lib/ai/agents/assessment.js`:
```js
import { runAgent } from "../baseAgent";
import { buildClientBlock, buildRequestBlock } from "../context";

export async function assess({ clientId, sessionData }) {
  const clientBlock = await buildClientBlock(clientId);
  const requestBlock = buildRequestBlock(
    sessionData ? "Reassessment — new session input" : "Initial assessment request",
    { sessionData: sessionData ?? null }
  );
  return runAgent({ agentType: "assessment", clientBlock, requestBlock });
}
```
`diagnostic.js` (`diagnose`), `treatment.js` (`plan`), `progress.js` (`evaluateProgress`),
`documentation.js` (`document`) are identical in shape — export one named function each, change
`agentType`, and tailor the request label. For agents that consume an upstream report (diagnostic
takes the assessment, documentation takes the progress), accept it as an arg and append it to the
request block via `buildRequestBlock("Upstream <X> report", report)`.

### `src/lib/ai/orchestrator.js`

```js
import { assess } from "./agents/assessment";
import { diagnose } from "./agents/diagnostic";
import { plan } from "./agents/treatment";
import { evaluateProgress } from "./agents/progress";
import { document as documentSession } from "./agents/documentation";
import { persistReport } from "@/lib/report-utils"; // see note below

// Each workflow runs in-process, sequentially, passing prior outputs forward, persisting each.
export async function runWorkflow({ type, clientId, sessionId, userId, sessionData }) {
  const save = (env) => persistReport({ ...env, clientId, sessionId, userId });

  if (type === "intake") {
    const a = await assess({ clientId, sessionData }); await save(a);
    const d = await diagnose({ clientId, assessment: a }); await save(d);
    return { assessment: a, diagnostic: d };
  }
  if (type === "pre-session") {
    const t = await plan({ clientId }); await save(t);
    return { treatment: t };
  }
  if (type === "post-session") {
    const p = await evaluateProgress({ clientId, sessionData }); await save(p);
    const doc = await documentSession({ clientId, progress: p, sessionData }); await save(doc);
    return { progress: p, documentation: doc };
  }
  throw new Error(`Unknown workflow type: ${type}`);
}
```

`persistReport` helper (add to `src/lib/report-utils.js`): maps an envelope to the AIReport doc
shape — `{ clientId, counselorId: userId, sessionId, agentType: env.agentType, summary: env.summary,
payload: env.payload, source: "agent-v2", metadata: { modelVersion: "gpt-5.5", timestamp: new Date() } }`
— and saves it.

### Thin route handler pattern (apply to all five specialist routes)

`src/app/api/ai/assessment/route.js`:
```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assess } from "@/lib/ai/agents/assessment";
import { persistReport } from "@/lib/report-utils";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId, sessionData, sessionId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  try {
    const env = await assess({ clientId, sessionData });
    await persistReport({ ...env, clientId, sessionId, userId: user.id });
    return NextResponse.json(env);
  } catch (e) {
    console.error("assessment agent error", e);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}
```

`agent-workflow/route.js` becomes the same shape, calling `runWorkflow({ type, clientId, sessionId, userId: user.id, sessionData })`.

---

## Measurement-Based Care

### `src/data/instruments/phq9.json`

PHQ-9 is public domain (no permission or fee required to reproduce).

```json
{
  "id": "phq9",
  "name": "Patient Health Questionnaire-9",
  "construct": "Depression",
  "recallWindow": "Over the last 2 weeks",
  "stem": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  "responseOptions": [
    { "label": "Not at all", "value": 0 },
    { "label": "Several days", "value": 1 },
    { "label": "More than half the days", "value": 2 },
    { "label": "Nearly every day", "value": 3 }
  ],
  "items": [
    { "id": "phq9_1", "text": "Little interest or pleasure in doing things" },
    { "id": "phq9_2", "text": "Feeling down, depressed, or hopeless" },
    { "id": "phq9_3", "text": "Trouble falling or staying asleep, or sleeping too much" },
    { "id": "phq9_4", "text": "Feeling tired or having little energy" },
    { "id": "phq9_5", "text": "Poor appetite or overeating" },
    { "id": "phq9_6", "text": "Feeling bad about yourself, or that you are a failure, or have let yourself or your family down" },
    { "id": "phq9_7", "text": "Trouble concentrating on things, such as reading the newspaper or watching television" },
    { "id": "phq9_8", "text": "Moving or speaking so slowly that other people could have noticed; or being so fidgety or restless that you have been moving around a lot more than usual" },
    { "id": "phq9_9", "text": "Thoughts that you would be better off dead, or of hurting yourself in some way" }
  ],
  "scoring": { "method": "sum", "min": 0, "max": 27 },
  "bands": [
    { "min": 0, "max": 4, "label": "Minimal" },
    { "min": 5, "max": 9, "label": "Mild" },
    { "min": 10, "max": 14, "label": "Moderate" },
    { "min": 15, "max": 19, "label": "Moderately severe" },
    { "min": 20, "max": 27, "label": "Severe" }
  ],
  "reliableChange": 5,
  "criticalItems": [
    { "itemId": "phq9_9", "threshold": 1, "flag": "suicidal-ideation",
      "note": "Any non-zero response triggers a same-day risk review." }
  ]
}
```

### `src/data/instruments/gad7.json`

GAD-7 is public domain.

```json
{
  "id": "gad7",
  "name": "Generalized Anxiety Disorder-7",
  "construct": "Anxiety",
  "recallWindow": "Over the last 2 weeks",
  "stem": "Over the last 2 weeks, how often have you been bothered by the following problems?",
  "responseOptions": [
    { "label": "Not at all", "value": 0 },
    { "label": "Several days", "value": 1 },
    { "label": "More than half the days", "value": 2 },
    { "label": "Nearly every day", "value": 3 }
  ],
  "items": [
    { "id": "gad7_1", "text": "Feeling nervous, anxious, or on edge" },
    { "id": "gad7_2", "text": "Not being able to stop or control worrying" },
    { "id": "gad7_3", "text": "Worrying too much about different things" },
    { "id": "gad7_4", "text": "Trouble relaxing" },
    { "id": "gad7_5", "text": "Being so restless that it is hard to sit still" },
    { "id": "gad7_6", "text": "Becoming easily annoyed or irritable" },
    { "id": "gad7_7", "text": "Feeling afraid, as if something awful might happen" }
  ],
  "scoring": { "method": "sum", "min": 0, "max": 21 },
  "bands": [
    { "min": 0, "max": 4, "label": "Minimal" },
    { "min": 5, "max": 9, "label": "Mild" },
    { "min": 10, "max": 14, "label": "Moderate" },
    { "min": 15, "max": 21, "label": "Severe" }
  ],
  "reliableChange": 4,
  "criticalItems": []
}
```

### `src/lib/mbc/instruments.js`

```js
import phq9 from "@/data/instruments/phq9.json";
import gad7 from "@/data/instruments/gad7.json";

const REGISTRY = { phq9, gad7 };

export function getInstrument(id) {
  const i = REGISTRY[id];
  if (!i) throw new Error(`Unknown instrument: ${id}`);
  return i;
}
export function listInstruments() {
  return Object.values(REGISTRY).map(({ id, name, construct }) => ({ id, name, construct }));
}
```

### `src/lib/mbc/score.js`

```js
import { getInstrument } from "./instruments";

/**
 * responses: [{ itemId, value }]. Returns { total, severityBand, flags:[{flag,itemId,note}], complete }.
 * Sum scoring only for now (PHQ-9 / GAD-7). Extend when an instrument needs subscales.
 */
export function scoreInstrument(instrumentId, responses) {
  const inst = getInstrument(instrumentId);
  const byItem = new Map(responses.map((r) => [r.itemId, Number(r.value)]));
  const complete = inst.items.every((it) => byItem.has(it.id));
  const total = inst.items.reduce((s, it) => s + (byItem.get(it.id) ?? 0), 0);

  const band = inst.bands.find((b) => total >= b.min && total <= b.max);
  const flags = [];
  for (const c of inst.criticalItems ?? []) {
    if ((byItem.get(c.itemId) ?? 0) >= c.threshold) {
      flags.push({ flag: c.flag, itemId: c.itemId, note: c.note });
    }
  }
  return { total, severityBand: band?.label ?? "Unknown", flags, complete };
}
```

### `src/models/measureAdministration.js`

```js
import mongoose from "mongoose";

const measureAdministrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    instrumentId: { type: String, required: true }, // e.g. "phq9"
    responses: [{ itemId: String, value: Number }],
    total: { type: Number, required: true },
    severityBand: { type: String, required: true },
    flags: [{ flag: String, itemId: String, note: String }],
    administeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

measureAdministrationSchema.index({ clientId: 1, instrumentId: 1, administeredAt: -1 });

export default mongoose.models.MeasureAdministration ||
  mongoose.model("MeasureAdministration", measureAdministrationSchema);
```

### `src/lib/mbc/trend.js`

```js
import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import { getInstrument } from "./instruments";

/** Oldest -> newest series for an instrument, plus reliable-change vs the prior point. */
export async function getTrend(clientId, instrumentId, limit = 6) {
  await connectDB();
  const docs = await MeasureAdministration.find({ clientId, instrumentId })
    .sort({ administeredAt: -1 }).limit(limit).lean();
  docs.reverse();
  if (docs.length === 0) return { instrumentId, points: [], direction: "insufficient-data" };

  const inst = getInstrument(instrumentId);
  const points = docs.map((d) => ({
    date: d.administeredAt, total: d.total, band: d.severityBand, flags: d.flags ?? [],
  }));
  const latest = points.at(-1).total;
  const prev = points.length > 1 ? points.at(-2).total : null;
  const delta = prev == null ? null : latest - prev;
  const reliableChange = delta == null ? false : Math.abs(delta) >= inst.reliableChange;
  const direction = delta == null ? "insufficient-data"
    : delta < 0 ? "improved" : delta > 0 ? "worsened" : "unchanged";

  return { instrumentId, name: inst.name, points, latest, previous: prev, delta, reliableChange, direction };
}
```

> Lower score = improvement for PHQ-9/GAD-7, hence `delta < 0` is "improved". Keep that convention.

---

## Prompt files (clinical role + reasoning only — NO JSON, NO format instructions)

Structured Outputs enforces shape. Prompts are now short and purely clinical. Each goes in
`prompts/<name>.md`.

### `prompts/assessment.md`
```md
You are a licensed mental-health clinician performing a structured intake/reassessment.

Given the client record, history, prior reports, and any current-session input, evaluate the
client's present clinical picture: presenting concerns, risk, and protective factors.

Principles:
- Be specific and evidence-grounded; cite what in the record supports each judgment.
- Risk is ordinal: none < low < moderate < high < imminent. Use "imminent" only when the record
  indicates an active safety concern requiring same-day action (e.g. a PHQ-9 item-9 flag, stated
  intent/plan). When risk is moderate or above, populate immediate-attention items concretely.
- Recommend standardized instruments by name (PHQ-9, GAD-7, PCL-5, etc.) appropriate to the
  presentation, so progress can be measured over time.
- Do not diagnose here — that is the diagnostic step. Stay at the assessment level.
- Never invent history that is not in the record. If data is missing, say what is needed.
```

### `prompts/diagnostic.md`
```md
You are a licensed clinician producing a DSM-5-TR / ICD-10 differential.

Use the assessment and full record. Provide a primary diagnosis with the specific criteria met and
the evidence from the record, ranked differentials, conditions to rule out, and likely
comorbidities. Note cultural and contextual factors that affect interpretation.

Principles:
- Tie every diagnosis to observable criteria and to specific items in the record.
- Calibrate confidence honestly (low/moderate/high); prefer "rule out" over overcommitting.
- Flag where a standardized measure or further data would change the picture.
- This is clinical decision support for a licensed professional, not a final diagnosis.
```

### `prompts/treatment.md`
```md
You are a clinician building an evidence-based treatment plan.

From the diagnosis, assessment, and history, produce a plan: primary modality, measurable goals,
concrete interventions, between-session homework, any referrals, and a review cadence.

Principles:
- Match modality to the presentation and evidence base (e.g. CBT/ERP for OCD, PE/CPT for PTSD,
  DBT for emotion dysregulation). Justify the choice briefly in the goals' measures.
- Every goal must be measurable, ideally tied to an instrument already in use for this client so
  progress is tracked objectively.
- Set a concrete review cadence for re-administering measures and reassessing.
```

### `prompts/progress.md`
```md
You are a clinician evaluating treatment progress using measurement-based care.

You are given the treatment plan, recent sessions, prior reports, and the client's MEASURE TRENDS
(oldest -> newest score series for each instrument, with reliable-change thresholds applied).

Principles:
- Interpret the trends you are given. DO NOT invent or estimate scores — only reason about the
  numbers present. If a trend says "insufficient-data", say so and recommend administering the measure.
- For each instrument, state direction (lower = improvement for PHQ-9/GAD-7) and whether the change
  exceeds the reliable-change threshold (i.e. is clinically meaningful vs noise).
- Connect symptom-score movement to goal progress and treatment effectiveness. Name barriers.
- Recommend reassessment when scores stall, worsen, or a risk flag appears.
```

### `prompts/documentation.md`
```md
You are a clinician writing the official session note in SOAP format.

Produce concise, defensible documentation from the session input, the progress evaluation, and the
record. Subjective = client report; Objective = observable/measured (including any instrument
scores administered this session); Assessment = clinical interpretation; Plan = next steps.

Principles:
- Write in professional clinical register, third person, no filler.
- Include an explicit risk statement every note, even if "no acute risk indicated; client denies SI."
- Echo any instruments scored this session with score and severity band.
- The CPT/service-code hint is advisory only; never assert billing as fact.
```

---

## Acceptance criteria (smoke test before commit)

1. `npm run dev` boots; no import errors.
2. Create a **synthetic** client. `POST /api/ai/assessment { clientId }` returns a body that parses
   against `ENVELOPES.assessment` (agentType + summary + payload). Confirm a discounted-input-token
   "cached" figure appears in OpenAI usage on a second call for the same client (prefix cache hit).
3. `POST /api/ai/agent-workflow { type:"intake", clientId }` runs assessment → diagnostic
   **in one HTTP round-trip**, persists two AIReport docs with `agentType` set, no `fetch()` to own
   routes (grep the new code: zero `fetch(` calls in `orchestrator.js` / agents).
4. Insert two `MeasureAdministration` PHQ-9 docs for a client (e.g. totals 18 then 11);
   `getTrend(clientId,"phq9")` returns `direction:"improved"`, `delta:-7`, `reliableChange:true`.
5. A PHQ-9 with `phq9_9 = 2` produces a `suicidal-ideation` flag from `scoreInstrument`, and that
   flag is visible in the client block fed to the assessment agent (verify the agent's
   `immediateAttention`/`riskLevel` reflects it).
6. `prompts/*.md` contain no JSON or "respond in this format" text; format comes only from schemas.

## Commit

```
feat(ai): unified agent core + MBC foundation

- replace 6 overlapping .passthrough() schemas with ReportEnvelope (discriminated union)
- baseAgent.runAgent() on gpt-5.5 via Structured Outputs; static-first prompt order for caching
- externalize specialist prompts to /prompts (no embedded JSON)
- in-process orchestrator replaces HTTP fan-out agent-workflow
- MBC: PHQ-9/GAD-7 fixtures, scoring, MeasureAdministration model, trend helper
- progress agent reasons over measure trends; PHQ-9 item-9 SI flag flows to risk
- aiReport: type->agentType, content->summary+payload, add index
```

## Sets up Round 2 (LIAM)

This round leaves `conversational/route.js` and a streaming hole in `baseAgent` intentionally.
Round 2 renames conversational → LIAM at `/api/liam/chat`, adds `streamText` + `liam_threads`
memory, the shadcn Sheet surface + Cmd-K, and — per the clinical-UX decision — gives LIAM the
ability to surface the MBC risk flags and trends this round just created.
