// Presentational renderers for each agent's report payload. Single source of truth —
// when an envelope payload shape changes in schemas.js, edit ONLY this file.
import { Badge } from "@/components/ui/badge";

// Small shared helpers so the bodies stay terse.
const List = ({ items }) =>
  items?.length ? (
    <ul className="list-disc pl-5 text-sm space-y-0.5">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">None noted.</p>
  );

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
      <Field label="Risk level">
        <Badge variant="secondary">{p.riskLevel}</Badge>
      </Field>
      <Field label="Primary concerns">
        <List items={p.primaryConcerns} />
      </Field>
      <Field label="Risk factors">
        <List items={p.riskFactors} />
      </Field>
      <Field label="Protective factors">
        <List items={p.protectiveFactors} />
      </Field>
      <Field label="Recommended instruments">
        <List items={p.recommendedInstruments} />
      </Field>
      <Field label="Immediate attention">
        <List items={p.immediateAttention} />
      </Field>
      <Field label="Clinical observations">
        <p className="text-sm">{p.clinicalObservations}</p>
      </Field>
      <Field label="Suggested next steps">
        <List items={p.suggestedNextSteps} />
      </Field>
    </div>
  );
}

export function DiagnosticBody({ payload: p }) {
  if (!p) return null;
  const Dx = ({ d }) =>
    d ? (
      <div className="rounded-md border p-2 text-sm">
        <span className="font-medium">
          {d.code} — {d.name}
        </span>{" "}
        <Badge variant="outline" className="ml-1">
          {d.confidence}
        </Badge>
        {d.rationale && <p className="text-muted-foreground mt-1">{d.rationale}</p>}
        {d.criteriaMet?.length ? <List items={d.criteriaMet} /> : null}
      </div>
    ) : null;
  return (
    <div className="space-y-3">
      <Field label="Primary diagnosis">
        <Dx d={p.primaryDiagnosis} />
      </Field>
      <Field label="Differentials">
        {p.differentials?.length ? (
          <div className="space-y-2">
            {p.differentials.map((d, i) => (
              <Dx key={i} d={d} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None noted.</p>
        )}
      </Field>
      <Field label="Rule out">
        <List items={p.ruleOut} />
      </Field>
      <Field label="Comorbidities">
        {p.comorbidities?.length ? (
          <div className="space-y-2">
            {p.comorbidities.map((d, i) => (
              <Dx key={i} d={d} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None noted.</p>
        )}
      </Field>
      <Field label="Cultural considerations">
        <List items={p.culturalConsiderations} />
      </Field>
      <Field label="Clinical justification">
        <p className="text-sm">{p.clinicalJustification}</p>
      </Field>
    </div>
  );
}

export function TreatmentBody({ payload: p }) {
  if (!p) return null;
  return (
    <div className="space-y-3">
      <Field label="Approach">
        <p className="text-sm">{p.approach}</p>
      </Field>
      <Field label="Goals">
        {p.goals?.length ? (
          <ul className="space-y-1 text-sm">
            {p.goals.map((g, i) => (
              <li key={i}>
                <span className="font-medium">{g.goal}</span> — {g.measurable}{" "}
                <span className="text-muted-foreground">({g.targetTimeframe})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None noted.</p>
        )}
      </Field>
      <Field label="Interventions">
        <List items={p.interventions} />
      </Field>
      <Field label="Homework">
        <List items={p.homework} />
      </Field>
      <Field label="Referrals">
        <List items={p.referrals} />
      </Field>
      <Field label="Review cadence">
        <p className="text-sm">{p.reviewCadence}</p>
      </Field>
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
              <li key={i}>
                <Badge variant="outline" className="mr-1">
                  {g.status}
                </Badge>
                {g.goal} — <span className="text-muted-foreground">{g.notes}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None noted.</p>
        )}
      </Field>
      <Field label="Measure interpretation">
        {p.measureInterpretation?.length ? (
          <ul className="space-y-1 text-sm">
            {p.measureInterpretation.map((m, i) => (
              <li key={i}>
                {m.instrumentId}: {m.latestScore}
                {m.previousScore != null ? ` (was ${m.previousScore})` : ""} — {m.direction}
                {m.reliableChange ? ", reliable change" : ""}. {m.interpretation}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No measure data.</p>
        )}
      </Field>
      <Field label="Treatment effectiveness">
        <p className="text-sm">{p.treatmentEffectiveness}</p>
      </Field>
      <Field label="Barriers">
        <List items={p.barriers} />
      </Field>
      <Field label="Recommendations">
        <List items={p.recommendations} />
      </Field>
      <Field label="Next session focus">
        <p className="text-sm">{p.nextSessionFocus}</p>
      </Field>
      {/* Reassessment recommendation surfaces once, at the client-page banner. */}
    </div>
  );
}

export function DocumentationBody({ payload: p }) {
  if (!p?.soap) return null;
  const { soap } = p;
  return (
    <div className="space-y-3">
      {[
        ["Subjective", soap.subjective],
        ["Objective", soap.objective],
        ["Assessment", soap.assessment],
        ["Plan", soap.plan],
      ].map(([label, val]) => (
        <Field key={label} label={label}>
          <p className="text-sm whitespace-pre-wrap">{val}</p>
        </Field>
      ))}
      {p.riskStatement && (
        <Field label="Risk statement">
          <p className="text-sm">{p.riskStatement}</p>
        </Field>
      )}
      <Field label="Follow-up">
        <List items={p.followUp} />
      </Field>
      {p.cptHint && (
        <Field label="Suggested code">
          <p className="text-sm text-muted-foreground">{p.cptHint}</p>
        </Field>
      )}
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
