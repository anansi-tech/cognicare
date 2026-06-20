// Presentational renderers for each agent's report payload. Single source of truth —
// when an envelope payload shape changes in schemas.js, edit ONLY this file.
import { useState } from "react";
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

// Tracks its own display text so trailing newlines survive re-renders while
// propagating a parsed array to the parent on each change.
function EditableList({ value = [], onChange, placeholder }) {
  const [text, setText] = useState(() => value.join("\n"));
  function handleChange(e) {
    setText(e.target.value);
    onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
  }
  return (
    <textarea
      value={text}
      onChange={handleChange}
      rows={Math.max(3, value.length + 1)}
      placeholder={placeholder}
      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none"
    />
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
          <input
            type="text"
            value={p.approach ?? ""}
            onChange={(e) => set("approach", e.target.value)}
            className={INPUT_CLS}
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
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {p.goals.map((g, i) => (
                <li key={i}>
                  {g.goal} — {g.measurable}{" "}
                  <span className="text-muted-foreground">({g.targetTimeframe})</span>
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
          <EditableList value={p.interventions ?? []} onChange={(v) => set("interventions", v)} placeholder="One intervention per line" />
        ) : (
          <List items={p.interventions} />
        )}
      </Field>
      <Field label="Homework">
        {editable ? (
          <EditableList value={p.homework ?? []} onChange={(v) => set("homework", v)} placeholder="One item per line" />
        ) : (
          <List items={p.homework} />
        )}
      </Field>
      <Field label="Referrals">
        {editable ? (
          <EditableList value={p.referrals ?? []} onChange={(v) => set("referrals", v)} placeholder="One referral per line" />
        ) : (
          <List items={p.referrals} />
        )}
      </Field>
      <Field label="Review cadence">
        {editable ? (
          <input
            type="text"
            value={p.reviewCadence ?? ""}
            onChange={(e) => set("reviewCadence", e.target.value)}
            className={INPUT_CLS}
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
