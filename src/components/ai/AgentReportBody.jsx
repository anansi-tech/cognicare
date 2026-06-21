// Presentational renderers for each agent's report payload. Single source of truth —
// when an envelope payload shape changes in schemas.js, edit ONLY this file.

import { Badge } from "@/components/ui/badge";
import { EditText, EditList, EditSelect, EditRows } from "@/components/ai/editable";

const RISK_OPTIONS = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "imminent", label: "Imminent" },
];

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
    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</p>
    {children}
  </div>
);

// Ordinal status chips — semantic colors only (red/amber/yellow/green/slate),
// distinct from the brand blue. Lets a clinician scan severity at a glance.
const RISK_BADGE = {
  none: "bg-emerald-100 text-emerald-800 border-emerald-400",
  low: "bg-green-100 text-green-800 border-green-400",
  moderate: "bg-amber-200 text-amber-900 border-amber-400",
  high: "bg-orange-100 text-orange-800 border-orange-400",
  imminent: "bg-red-100 text-red-800 border-red-400",
};
const CONFIDENCE_BADGE = {
  low: "bg-amber-100 text-amber-800 border-amber-400",
  moderate: "bg-slate-200 text-slate-800 border-slate-400",
  high: "bg-emerald-100 text-emerald-800 border-emerald-400",
};
const GOAL_BADGE = {
  "not-started": "bg-slate-200 text-slate-600 border-slate-400",
  emerging: "bg-amber-100 text-amber-800 border-amber-400",
  progressing: "bg-yellow-100 text-yellow-800 border-yellow-400",
  met: "bg-green-100 text-green-800 border-green-400",
  regressed: "bg-red-100 text-red-800 border-red-400",
};
const NEUTRAL_BADGE = "bg-slate-100 text-slate-700 border-slate-400";

const StatusBadge = ({ map, value, label }) => {
  const cls = map[value] || NEUTRAL_BADGE;
  return (
    <Badge variant="outline" className={cls}>
      {label ?? value}
    </Badge>
  );
};

export function AssessmentBody({ payload: p, editable = false, onChange }) {
  if (!p) return null;
  const set = (k, v) => onChange?.({ ...p, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Risk level">
        {editable ? (
          <EditSelect value={p.riskLevel} onChange={(v) => set("riskLevel", v)} options={RISK_OPTIONS} />
        ) : (
          <StatusBadge map={RISK_BADGE} value={p.riskLevel} />
        )}
      </Field>
      <Field label="Primary concerns">
        {editable ? (
          <EditList value={p.primaryConcerns ?? []} onChange={(v) => set("primaryConcerns", v)} placeholder="Add a concern" />
        ) : (
          <List items={p.primaryConcerns} />
        )}
      </Field>
      <Field label="Risk factors">
        {editable ? (
          <EditList value={p.riskFactors ?? []} onChange={(v) => set("riskFactors", v)} placeholder="Add a risk factor" />
        ) : (
          <List items={p.riskFactors} />
        )}
      </Field>
      <Field label="Protective factors">
        {editable ? (
          <EditList value={p.protectiveFactors ?? []} onChange={(v) => set("protectiveFactors", v)} placeholder="Add a protective factor" />
        ) : (
          <List items={p.protectiveFactors} />
        )}
      </Field>
      <Field label="Recommended instruments">
        {editable ? (
          <EditList value={p.recommendedInstruments ?? []} onChange={(v) => set("recommendedInstruments", v)} placeholder="Add an instrument" />
        ) : (
          <List items={p.recommendedInstruments} />
        )}
      </Field>
      <Field label="Immediate attention">
        {editable ? (
          <EditList value={p.immediateAttention ?? []} onChange={(v) => set("immediateAttention", v)} placeholder="Add an item" />
        ) : (
          <List items={p.immediateAttention} />
        )}
      </Field>
      <Field label="Clinical observations">
        {editable ? (
          <EditText value={p.clinicalObservations ?? ""} onChange={(v) => set("clinicalObservations", v)} rows={4} />
        ) : (
          <p className="text-sm">{p.clinicalObservations}</p>
        )}
      </Field>
      <Field label="Suggested next steps">
        {editable ? (
          <EditList value={p.suggestedNextSteps ?? []} onChange={(v) => set("suggestedNextSteps", v)} placeholder="Add a next step" />
        ) : (
          <List items={p.suggestedNextSteps} />
        )}
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

const GOAL_FIELDS = [
  { key: "goal", label: "Goal", type: "text", rows: 2 },
  { key: "measurable", label: "How measured", type: "text", rows: 2 },
  { key: "targetTimeframe", label: "Timeframe", type: "text", rows: 1 },
];

export function TreatmentBody({ payload: p, editable = false, onChange }) {
  if (!p) return null;

  function set(key, value) {
    onChange({ ...p, [key]: value });
  }

  return (
    <div className="space-y-3">
      {p.changeSummary && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          <span className="font-medium">What changed: </span>{p.changeSummary}
        </div>
      )}
      <Field label="Approach">
        {editable ? (
          <EditText value={p.approach ?? ""} onChange={(v) => set("approach", v)} rows={2} />
        ) : (
          <p className="text-sm">{p.approach}</p>
        )}
      </Field>
      <Field label="Goals">
        {editable ? (
          <EditRows
            value={p.goals ?? []}
            onChange={(v) => set("goals", v)}
            fields={GOAL_FIELDS}
            addLabel="+ Add goal"
            emptyRow={{ goal: "", measurable: "", targetTimeframe: "" }}
          />
        ) : (
          p.goals?.length ? (
            <ul className="space-y-2">
              {p.goals.map((g, i) => (
                <li key={i} className="rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm">
                  <div className="font-medium text-gray-900">{g.goal}</div>
                  {g.measurable && (
                    <div className="mt-0.5 text-gray-600">
                      <span className="text-xs uppercase tracking-wide text-gray-400">Measure</span>{" "}
                      {g.measurable}
                    </div>
                  )}
                  {g.targetTimeframe && (
                    <div className="mt-0.5 text-gray-600">
                      <span className="text-xs uppercase tracking-wide text-gray-400">Timeframe</span>{" "}
                      {g.targetTimeframe}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None noted.</p>
          )
        )}
      </Field>
      <Field label="Interventions">
        {editable ? (
          <EditList value={p.interventions ?? []} onChange={(v) => set("interventions", v)} placeholder="Add an intervention" />
        ) : (
          <List items={p.interventions} />
        )}
      </Field>
      <Field label="Homework">
        {editable ? (
          <EditList value={p.homework ?? []} onChange={(v) => set("homework", v)} placeholder="Add a homework item" />
        ) : (
          <List items={p.homework} />
        )}
      </Field>
      <Field label="Referrals">
        {editable ? (
          <EditList value={p.referrals ?? []} onChange={(v) => set("referrals", v)} placeholder="Add a referral" />
        ) : (
          <List items={p.referrals} />
        )}
      </Field>
      <Field label="Review cadence">
        {editable ? (
          <EditText value={p.reviewCadence ?? ""} onChange={(v) => set("reviewCadence", v)} rows={2} />
        ) : (
          <p className="text-sm">{p.reviewCadence}</p>
        )}
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
          <ul className="space-y-2">
            {p.measureInterpretation.map((m, i) => {
              const arrow =
                m.direction === "improved" ? "↗" :
                m.direction === "worsened" ? "↘" :
                m.direction === "unchanged" ? "→" : null;
              const arrowColor =
                m.direction === "improved" ? "text-green-600" :
                m.direction === "worsened" ? "text-red-600" : "text-gray-400";
              return (
                <li key={i} className="rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{m.instrumentId}</span>
                    <span className="font-medium text-gray-900">
                      {m.previousScore != null ? `${m.previousScore} → ` : ""}{m.latestScore}
                    </span>
                    {arrow && <span className={`font-semibold ${arrowColor}`}>{arrow} {m.direction}</span>}
                    {m.reliableChange && (
                      <span className="rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium px-2 py-0.5">
                        Reliable change
                      </span>
                    )}
                  </div>
                  {m.interpretation && (
                    <p className="mt-1 text-gray-600">{m.interpretation}</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No standardized measures recorded for this period.
          </p>
        )}
      </Field>
      <Field label="Goal progress">
        {p.goalProgress?.length ? (
          <ul className="space-y-2">
            {p.goalProgress.map((g, i) => (
              <li key={i} className="rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <StatusBadge map={GOAL_BADGE} value={g.status} />
                  <span className="font-medium text-gray-900">{g.goal}</span>
                </div>
                {g.notes && <p className="mt-1 text-gray-600">{g.notes}</p>}
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
      {p.recommendations?.length ? (
        <Field label="Recommendations">
          <List items={p.recommendations} />
        </Field>
      ) : null}
      {p.treatmentEffectiveness && (
        <Field label="Treatment effectiveness">
          <p className="text-sm">{p.treatmentEffectiveness}</p>
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
