# Round 5 — Extract the shared AgentReportBody renderers

> Branch `dev`, working dir `products/cognicare`. Pure consolidation — **no visual or behavioral
> change intended**. This pays down the debt Claude Code flagged: the per-agent payload renderers
> exist in four+ places, so the next schema change means editing four+ files. After this, one file.

## The debt (verified)

The same agent payloads are rendered in four surfaces, all reading the **identical** envelope fields:
- `src/app/clients/[id]/reports/[reportId]/view/page.js` — named `AssessmentBody`/`DiagnosticBody`/… (local)
- `src/app/clients/[id]/ai-reports/[reportId]/page.js` — its **own copy** of `AssessmentBody`/… (local)
- `src/app/components/clients/ClientInsights.js` — inline `activeTab === "assessment"` JSX
- `src/app/components/sessions/SessionAIInsights.js` — inline `activeTab === "assessment"` JSX

The two viewer pages literally redeclare `AssessmentBody`/`DiagnosticBody`/etc. So the rendering
knowledge is duplicated ~6×. They do not differ in fields rendered (confirmed: assessment renders the
same 8 fields in all four). Any field rename in `schemas.js` currently requires touching all of them.

## Goal

One module exporting per-agent body components + a dispatcher. Every surface imports from it. Zero
behavior change — same fields, same order, same labels. This is a move-and-dedupe, not a redesign.

## Create `src/components/ai/AgentReportBody.jsx`

A small presentational module — no data fetching, no agentType branching logic beyond the dispatcher.
Each body takes a `payload` and renders its fields. Use the **existing markup** from the cleanest
current source (the `view/page.js` `*Body` components are the most complete — lift those, don't
reinvent). Keep them plain and readable.

```jsx
// Presentational renderers for each agent's report payload. Single source of truth —
// when an envelope payload shape changes in schemas.js, edit ONLY this file.
import { Badge } from "@/components/ui/badge";

// Small shared helpers so the bodies stay terse.
const List = ({ items }) =>
  items?.length ? (
    <ul className="list-disc pl-5 text-sm space-y-0.5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
  ) : <p className="text-sm text-muted-foreground">None noted.</p>;

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    {children}
  </div>
);

export function AssessmentBody({ payload: p }) {
  if (!p) return null;
  return (
    <div className="space-y-3">
      <Field label="Risk level"><Badge variant="secondary">{p.riskLevel}</Badge></Field>
      <Field label="Primary concerns"><List items={p.primaryConcerns} /></Field>
      <Field label="Risk factors"><List items={p.riskFactors} /></Field>
      <Field label="Protective factors"><List items={p.protectiveFactors} /></Field>
      <Field label="Recommended instruments"><List items={p.recommendedInstruments} /></Field>
      <Field label="Immediate attention"><List items={p.immediateAttention} /></Field>
      <Field label="Clinical observations"><p className="text-sm">{p.clinicalObservations}</p></Field>
      <Field label="Suggested next steps"><List items={p.suggestedNextSteps} /></Field>
    </div>
  );
}

export function DiagnosticBody({ payload: p }) {
  if (!p) return null;
  const Dx = ({ d }) => d ? (
    <div className="rounded-md border p-2 text-sm">
      <span className="font-medium">{d.code} — {d.name}</span>{" "}
      <Badge variant="outline" className="ml-1">{d.confidence}</Badge>
      {d.rationale && <p className="text-muted-foreground mt-1">{d.rationale}</p>}
      {d.criteriaMet?.length ? <List items={d.criteriaMet} /> : null}
    </div>
  ) : null;
  return (
    <div className="space-y-3">
      <Field label="Primary diagnosis"><Dx d={p.primaryDiagnosis} /></Field>
      <Field label="Differentials">{p.differentials?.map((d, i) => <Dx key={i} d={d} />) ?? <List />}</Field>
      <Field label="Rule out"><List items={p.ruleOut} /></Field>
      <Field label="Comorbidities">{p.comorbidities?.map((d, i) => <Dx key={i} d={d} />) ?? null}</Field>
      <Field label="Cultural considerations"><List items={p.culturalConsiderations} /></Field>
      <Field label="Clinical justification"><p className="text-sm">{p.clinicalJustification}</p></Field>
    </div>
  );
}

export function TreatmentBody({ payload: p }) {
  if (!p) return null;
  return (
    <div className="space-y-3">
      <Field label="Approach"><p className="text-sm">{p.approach}</p></Field>
      <Field label="Goals">
        {p.goals?.length ? (
          <ul className="space-y-1 text-sm">
            {p.goals.map((g, i) => (
              <li key={i}><span className="font-medium">{g.goal}</span> — {g.measurable} <span className="text-muted-foreground">({g.targetTimeframe})</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">None noted.</p>}
      </Field>
      <Field label="Interventions"><List items={p.interventions} /></Field>
      <Field label="Homework"><List items={p.homework} /></Field>
      <Field label="Referrals"><List items={p.referrals} /></Field>
      <Field label="Review cadence"><p className="text-sm">{p.reviewCadence}</p></Field>
    </div>
  );
}

export function ProgressBody({ payload: p }) {
  if (!p) return null;
  return (
    <div className="space-y-3">
      <Field label="Goal progress">
        {p.goalProgress?.length ? (
          <ul className="space-y-1 text-sm">
            {p.goalProgress.map((g, i) => (
              <li key={i}><Badge variant="outline" className="mr-1">{g.status}</Badge>{g.goal} — <span className="text-muted-foreground">{g.notes}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">None noted.</p>}
      </Field>
      <Field label="Measure interpretation">
        {p.measureInterpretation?.length ? (
          <ul className="space-y-1 text-sm">
            {p.measureInterpretation.map((m, i) => (
              <li key={i}>{m.instrumentId}: {m.latestScore}{m.previousScore != null ? ` (was ${m.previousScore})` : ""} — {m.direction}{m.reliableChange ? ", reliable change" : ""}. {m.interpretation}</li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">No measure data.</p>}
      </Field>
      <Field label="Treatment effectiveness"><p className="text-sm">{p.treatmentEffectiveness}</p></Field>
      <Field label="Barriers"><List items={p.barriers} /></Field>
      <Field label="Recommendations"><List items={p.recommendations} /></Field>
      <Field label="Next session focus"><p className="text-sm">{p.nextSessionFocus}</p></Field>
      {p.reassessmentRecommended && <Badge>Reassessment recommended</Badge>}
    </div>
  );
}

export function DocumentationBody({ payload: p }) {
  if (!p?.soap) return null;
  const { soap } = p;
  return (
    <div className="space-y-3">
      {[["Subjective", soap.subjective], ["Objective", soap.objective], ["Assessment", soap.assessment], ["Plan", soap.plan]].map(([label, val]) => (
        <Field key={label} label={label}><p className="text-sm whitespace-pre-wrap">{val}</p></Field>
      ))}
      {p.riskStatement && <Field label="Risk statement"><p className="text-sm">{p.riskStatement}</p></Field>}
      <Field label="Follow-up"><List items={p.followUp} /></Field>
      {p.cptHint && <Field label="Suggested code"><p className="text-sm text-muted-foreground">{p.cptHint}</p></Field>}
    </div>
  );
}

const BODIES = {
  assessment: AssessmentBody,
  diagnostic: DiagnosticBody,
  treatment: TreatmentBody,
  progress: ProgressBody,
  documentation: DocumentationBody,
};

// Dispatcher: pick the body by agentType.
export function AgentReportBody({ agentType, payload }) {
  const Body = BODIES[agentType];
  return Body ? <Body payload={payload} /> : null;
}
```

> The exact labels/markup above should match what the current `view/page.js` `*Body` components
> produce. If those differ in wording, **prefer the view-page version** (it's the most complete) and
> bring the others into line — that's an intended, acceptable visual normalization, since the four
> surfaces currently differ slightly anyway and converging them is the point.

## Replace the four surfaces

1. **`src/app/clients/[id]/reports/[reportId]/view/page.js`** — delete the local `AssessmentBody`…
   `DocumentationBody` definitions; import `{ AgentReportBody }` and render
   `<AgentReportBody agentType={agentType} payload={p} />`.
2. **`src/app/clients/[id]/ai-reports/[reportId]/page.js`** — same: delete its local `*Body` copies,
   use `<AgentReportBody … />`.
3. **`src/app/components/clients/ClientInsights.js`** — replace each `activeTab === "<agent>"` inline
   JSX block with `<AgentReportBody agentType="<agent>" payload={report?.payload} />` (keep the tab
   chrome and the report-selection logic; only the body rendering moves).
4. **`src/app/components/sessions/SessionAIInsights.js`** — same as ClientInsights.

## Acceptance criteria

1. `grep -rn "function AssessmentBody\|const AssessmentBody\|function DiagnosticBody" src` → only in
   `AgentReportBody.jsx` (the local copies are gone).
2. All four surfaces still render assessment/diagnostic/treatment/progress/documentation payloads —
   visually equivalent to before (minor wording normalization OK).
3. A field rename in `schemas.js` now requires editing **only** `AgentReportBody.jsx` to update all
   four surfaces. (Sanity-think it; don't actually rename.)
4. `npm run lint` clean; no console errors opening insights tabs, the AIReport viewer, and the
   compiled-Report viewer.

## Commit

```
refactor(cognicare): extract shared AgentReportBody — single source for agent payload rendering
```

## Then: the batched cleanup pass

After this, fold together the remaining small debt into one pass: the duplicate "Generate Report"
button (`ClientDetail:773` TODO), wiring `ClientAnalytics` to real MBC trends (the lingering
`TODO(Round 3)`), the stale "AI Assistant tab / Run Initial Assessment" copy sweep, the
`system`-option warning fix, and the AutoWorkflow "Try again" button. Then on to the infra rounds
(pricing → auth → encryption).
