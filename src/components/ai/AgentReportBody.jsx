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

// Per-row editable list: each item is its own bordered input with a remove
// button, so boundaries between items are clear (vs. one ambiguous textarea).
function EditableList({ value = [], onChange, placeholder }) {
  const items = value.length ? value : [""];
  const update = (i, v) => onChange(items.map((x, j) => (j === i ? v : x)).filter((s, j) => s.trim() || j === i));
  const removeAt = (i) => onChange(items.filter((_, j) => j !== i).filter((s) => s.trim()));
  const add = () => onChange([...items.filter((s) => s.trim()), ""]);
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-sm select-none">•</span>
          <input
            type="text"
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="text-muted-foreground hover:text-red-600 text-sm px-1"
            aria-label="Remove item"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-xs text-primary hover:text-primary/80">
        + Add item
      </button>
    </div>
  );
}

const INPUT_CLS = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";
const INPUT_SM  = "rounded-md border border-input bg-background px-2 py-1 text-sm";

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
          <textarea
            rows={2}
            value={p.approach ?? ""}
            onChange={(e) => set("approach", e.target.value)}
            className={`${INPUT_CLS} resize-none`}
          />
        ) : (
          <p className="text-sm">{p.approach}</p>
        )}
      </Field>
      <Field label="Goals">
        {editable ? (
          <div className="space-y-3">
            {(p.goals ?? []).map((g, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs text-muted-foreground">Goal</label>
                  <textarea
                    rows={2}
                    value={g.goal ?? ""}
                    placeholder="Goal"
                    onChange={(e) => set("goals", p.goals.map((x, j) => j === i ? { ...x, goal: e.target.value } : x))}
                    className={`${INPUT_SM} w-full resize-none`}
                  />
                  <label className="text-xs text-muted-foreground">How measured</label>
                  <textarea
                    rows={2}
                    value={g.measurable ?? ""}
                    placeholder="How measured"
                    onChange={(e) => set("goals", p.goals.map((x, j) => j === i ? { ...x, measurable: e.target.value } : x))}
                    className={`${INPUT_SM} w-full resize-none`}
                  />
                  <label className="text-xs text-muted-foreground">Timeframe</label>
                  <input
                    value={g.targetTimeframe ?? ""}
                    placeholder="e.g. 8 weeks"
                    onChange={(e) => set("goals", p.goals.map((x, j) => j === i ? { ...x, targetTimeframe: e.target.value } : x))}
                    className={`${INPUT_SM} w-40`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set("goals", p.goals.filter((_, j) => j !== i))}
                  className="mt-1 text-muted-foreground hover:text-destructive text-xs leading-none"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("goals", [...(p.goals ?? []), { goal: "", measurable: "", targetTimeframe: "" }])}
              className="text-xs text-primary hover:text-primary/80"
            >
              + Add goal
            </button>
          </div>
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
          <EditableList value={p.interventions ?? []} onChange={(v) => set("interventions", v)} placeholder="Add an intervention" />
        ) : (
          <List items={p.interventions} />
        )}
      </Field>
      <Field label="Homework">
        {editable ? (
          <EditableList value={p.homework ?? []} onChange={(v) => set("homework", v)} placeholder="Add a homework item" />
        ) : (
          <List items={p.homework} />
        )}
      </Field>
      <Field label="Referrals">
        {editable ? (
          <EditableList value={p.referrals ?? []} onChange={(v) => set("referrals", v)} placeholder="Add a referral" />
        ) : (
          <List items={p.referrals} />
        )}
      </Field>
      <Field label="Review cadence">
        {editable ? (
          <textarea
            rows={2}
            value={p.reviewCadence ?? ""}
            onChange={(e) => set("reviewCadence", e.target.value)}
            className={`${INPUT_CLS} resize-none`}
          />
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
