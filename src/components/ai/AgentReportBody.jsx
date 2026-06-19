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

// Ordinal status chips — semantic colors only (red/amber/yellow/green/slate),
// distinct from the brand blue. Lets a clinician scan severity at a glance.
const RISK_BADGE = {
  none: "bg-emerald-100 text-emerald-800 border-emerald-200",
  low: "bg-green-100 text-green-800 border-green-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  imminent: "bg-red-100 text-red-800 border-red-200",
};
const CONFIDENCE_BADGE = {
  low: "bg-amber-100 text-amber-800 border-amber-200",
  moderate: "bg-slate-100 text-slate-700 border-slate-200",
  high: "bg-emerald-100 text-emerald-800 border-emerald-200",
};
const GOAL_BADGE = {
  "not-started": "bg-slate-100 text-slate-600 border-slate-200",
  emerging: "bg-amber-100 text-amber-800 border-amber-200",
  progressing: "bg-yellow-100 text-yellow-800 border-yellow-200",
  met: "bg-green-100 text-green-800 border-green-200",
  regressed: "bg-red-100 text-red-800 border-red-200",
};
const NEUTRAL_BADGE = "bg-slate-100 text-slate-700 border-slate-200";

const StatusBadge = ({ map, value, label }) => {
  const cls = map[value] || NEUTRAL_BADGE;
  return (
    <Badge variant="outline" className={cls}>
      {label ?? value}
    </Badge>
  );
};

export function AssessmentBody({ payload: p }) {
  if (!p) return null;
  return (
    <div className="space-y-3">
      <Field label="Risk level">
        <StatusBadge map={RISK_BADGE} value={p.riskLevel} />
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
        <span className="ml-1 inline-flex">
          <StatusBadge map={CONFIDENCE_BADGE} value={d.confidence} />
        </span>
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
      {p.changeSummary && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          <span className="font-medium">What changed: </span>{p.changeSummary}
        </div>
      )}
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
          <p className="text-sm text-muted-foreground">
            No standardized measures recorded for this period.
          </p>
        )}
      </Field>
      <Field label="Goal progress">
        {p.goalProgress?.length ? (
          <ul className="space-y-1 text-sm">
            {p.goalProgress.map((g, i) => (
              <li key={i}>
                <span className="mr-1 inline-flex">
                  <StatusBadge map={GOAL_BADGE} value={g.status} />
                </span>
                {g.goal} — <span className="text-muted-foreground">{g.notes}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">None noted.</p>
        )}
      </Field>
      <Field label="Next session focus">
        <p className="text-sm">{p.nextSessionFocus}</p>
      </Field>
      <Field label="Barriers">
        <List items={p.barriers} />
      </Field>
      {/* Recommendations + Treatment effectiveness — secondary, muted. */}
      {p.recommendations?.length ? (
        <Field label="Recommendations">
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-0.5">
            {p.recommendations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Field>
      ) : null}
      {p.treatmentEffectiveness && (
        <Field label="Treatment effectiveness">
          <p className="text-xs text-muted-foreground">{p.treatmentEffectiveness}</p>
        </Field>
      )}
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
