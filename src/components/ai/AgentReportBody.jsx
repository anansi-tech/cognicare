// Presentational renderers for each agent's report payload. Single source of truth —
// when an envelope payload shape changes in schemas.js, edit ONLY this file.

import { EditText, EditList, EditSelect, EditRows, DiagnosisCandidateEditor, DiagnosisCandidateList } from "@/components/ai/editable";

// Options used only by editable branches — keep in sync with schemas.js enums.
const RISK_OPTIONS = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "imminent", label: "Imminent" },
];
const GOAL_STATUS_OPTIONS = [
  { value: "not-started", label: "Not started" },
  { value: "emerging", label: "Emerging" },
  { value: "progressing", label: "Progressing" },
  { value: "met", label: "Met" },
  { value: "regressed", label: "Regressed" },
];

// Sky severity/status palettes (bg + text)
const SEV = {
  none:     { bg: "#E7F6EC", color: "#3B9E57" },
  low:      { bg: "#E7F6EC", color: "#3B9E57" },
  moderate: { bg: "#FBF2DA", color: "#A9821F" },
  high:     { bg: "#FDECEC", color: "#C0392B" },
  imminent: { bg: "#F7D4D4", color: "#8E2020" },
};
const CONFIDENCE = {
  low:      { bg: "#FBF2DA", color: "#A9821F" },
  moderate: { bg: "#EEF1F5", color: "#6E7E97" },
  high:     { bg: "#E7F6EC", color: "#3B9E57" },
};
const GOAL = {
  "not-started": { bg: "#EEF1F5", color: "#6E7E97" },
  emerging:      { bg: "#EAF3FF", color: "#2F80FF" },
  progressing:   { bg: "#FBF2DA", color: "#A9821F" },
  met:           { bg: "#E7F6EC", color: "#3B9E57" },
  regressed:     { bg: "#FDECEC", color: "#C0392B" },
};
const NEUTRAL = { bg: "#EEF1F5", color: "#6E7E97" };

const StatusBadge = ({ map, value, label }) => {
  const c = map[value] || NEUTRAL;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700, textTransform: "capitalize", padding: "2px 10px", borderRadius: 999, background: c.bg, color: c.color }}>
      {label ?? value}
    </span>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginTop: 16 }}>
    <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#7C93B8", margin: "0 0 7px" }}>{label}</p>
    {children}
  </div>
);

const List = ({ items }) =>
  items?.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {items.map((x, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: "#9FB6D8", marginTop: 7 }} />
          <span style={{ fontSize: 13, lineHeight: 1.55, color: "#41557A" }}>{x}</span>
        </div>
      ))}
    </div>
  ) : (
    <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>
  );

const Para = ({ children }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#41557A", margin: 0 }}>{children}</p>
);

export function AssessmentBody({ payload: p, editable = false, onChange }) {
  if (!p) return null;
  const set = (k, v) => onChange?.({ ...p, [k]: v });
  return (
    <div>
      <Field label="Risk level">
        {editable ? (
          <EditSelect value={p.riskLevel} onChange={(v) => set("riskLevel", v)} options={RISK_OPTIONS} />
        ) : (
          <span style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", padding: "3px 9px", borderRadius: 6, background: (SEV[p.riskLevel] || NEUTRAL).bg, color: (SEV[p.riskLevel] || NEUTRAL).color }}>
            {p.riskLevel}
          </span>
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
          <Para>{p.clinicalObservations}</Para>
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

export function DiagnosticBody({ payload: p, editable = false, onChange }) {
  if (!p) return null;
  const set = (k, v) => onChange?.({ ...p, [k]: v });
  const Dx = ({ d }) =>
    d ? (
      <div style={{ border: "1px solid #E7EEF7", background: "#F9FBFE", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", background: "#0B2B6B", color: "#fff", fontWeight: 700, padding: "3px 9px", borderRadius: 7, fontSize: 12 }}>
            {d.code}
          </span>
          <span style={{ fontWeight: 600, color: "#0B2B6B", fontSize: 13.5 }}>{d.name}</span>
          <span style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", padding: "3px 9px", borderRadius: 6, background: (CONFIDENCE[d.confidence] || NEUTRAL).bg, color: (CONFIDENCE[d.confidence] || NEUTRAL).color }}>
            {d.confidence}
          </span>
        </div>
        {d.rationale && <p style={{ fontSize: 12.5, color: "#7C8DA8", lineHeight: 1.5, marginTop: 5, marginBottom: 0 }}>{d.rationale}</p>}
        {d.criteriaMet?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 5 }}>
            {d.criteriaMet.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, width: 4, height: 4, borderRadius: "50%", background: "#B8C9DC", marginTop: 7 }} />
                <span style={{ fontSize: 12.5, color: "#7C8DA8", lineHeight: 1.5 }}>{c}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ) : null;
  return (
    <div>
      <Field label="Primary diagnosis">
        {editable ? (
          <DiagnosisCandidateEditor
            value={p.primaryDiagnosis ?? {}}
            onChange={(v) => set("primaryDiagnosis", v)}
          />
        ) : (
          <Dx d={p.primaryDiagnosis} />
        )}
      </Field>
      <Field label="Differentials">
        {editable ? (
          <DiagnosisCandidateList
            value={p.differentials ?? []}
            onChange={(v) => set("differentials", v)}
          />
        ) : p.differentials?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {p.differentials.map((d, i) => (
              <Dx key={i} d={d} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>
        )}
      </Field>
      <Field label="Rule out">
        {editable ? (
          <EditList value={p.ruleOut ?? []} onChange={(v) => set("ruleOut", v)} placeholder="Add a rule-out" />
        ) : (
          <List items={p.ruleOut} />
        )}
      </Field>
      <Field label="Comorbidities">
        {editable ? (
          <DiagnosisCandidateList
            value={p.comorbidities ?? []}
            onChange={(v) => set("comorbidities", v)}
            addLabel="+ Add comorbidity"
          />
        ) : p.comorbidities?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {p.comorbidities.map((d, i) => (
              <Dx key={i} d={d} />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>
        )}
      </Field>
      <Field label="Cultural considerations">
        {editable ? (
          <EditList value={p.culturalConsiderations ?? []} onChange={(v) => set("culturalConsiderations", v)} placeholder="Add a consideration" />
        ) : (
          <List items={p.culturalConsiderations} />
        )}
      </Field>
      <Field label="Clinical justification">
        {editable ? (
          <EditText value={p.clinicalJustification ?? ""} onChange={(v) => set("clinicalJustification", v)} rows={4} />
        ) : (
          <Para>{p.clinicalJustification}</Para>
        )}
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
    <div>
      {p.changeSummary && (
        <div style={{ background: "#FBF2DA", border: "1px solid #F6D87A", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: "#A9821F", marginBottom: 4 }}>
          <span style={{ fontWeight: 700 }}>What changed: </span>{p.changeSummary}
        </div>
      )}
      <Field label="Approach">
        {editable ? (
          <EditText value={p.approach ?? ""} onChange={(v) => set("approach", v)} rows={2} />
        ) : (
          <Para>{p.approach}</Para>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {p.goals.map((g, i) => (
                <div key={i} style={{ borderLeft: "3px solid #2F80FF", background: "#F7FAFE", borderRadius: "0 12px 12px 0", padding: "11px 14px" }}>
                  <div style={{ fontWeight: 600, color: "#24344F", fontSize: 13.5 }}>{g.goal}</div>
                  {g.measurable && (
                    <div style={{ marginTop: 4, fontSize: 13, color: "#158A98" }}>
                      Measure: {g.measurable}
                    </div>
                  )}
                  {g.targetTimeframe && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", background: "#EAF3FF", color: "#2F80FF", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                        {g.targetTimeframe}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>
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
          <Para>{p.reviewCadence}</Para>
        )}
      </Field>
    </div>
  );
}

export function ProgressBody({ payload: p, editable = false, onChange }) {
  if (!p) return null;
  const set = (k, v) => onChange?.({ ...p, [k]: v });

  const MeasureScoreHeader = ({ m }) => {
    const arrow = m.direction === "improved" ? "↗" : m.direction === "worsened" ? "↘" : m.direction === "unchanged" ? "→" : null;
    const t = m.direction === "improved" ? { bg: "#E7F6EC", color: "#3B9E57" }
      : m.direction === "worsened" ? { bg: "#FDECEC", color: "#C0392B" }
      : { bg: "#EEF1F5", color: "#6E7E97" };
    return (
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 7, minWidth: 172 }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#0B2B6B" }}>{m.instrumentId?.toUpperCase()}</span>
        <span style={{ fontSize: 12.5, color: "#55698F", fontVariantNumeric: "tabular-nums" }}>
          {m.previousScore != null ? `${m.previousScore} → ` : ""}{m.latestScore}
        </span>
        {arrow && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: t.bg, color: t.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{arrow} {m.direction}</span>}
        {m.reliableChange && <span style={{ background: "#EAF3FF", color: "#2F80FF", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>Reliable change</span>}
      </div>
    );
  };

  return (
    <div>
      <Field label="Measure interpretation">
        {p.measureInterpretation?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {p.measureInterpretation.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <MeasureScoreHeader m={m} />
                {/* Scores are objective data — only the clinical interpretation text is editable. */}
                {editable ? (
                  <EditText
                    value={m.interpretation ?? ""}
                    onChange={(v) =>
                      set("measureInterpretation",
                        p.measureInterpretation.map((x, j) => (j === i ? { ...x, interpretation: v } : x))
                      )
                    }
                    rows={2}
                  />
                ) : (
                  m.interpretation && <span style={{ fontSize: 12.5, color: "#7C8DA8", lineHeight: 1.5 }}>{m.interpretation}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#8298BC" }}>
            No standardized measures recorded for this period.
          </p>
        )}
      </Field>
      <Field label="Goal progress">
        {editable ? (
          <EditRows
            value={p.goalProgress ?? []}
            onChange={(v) => set("goalProgress", v)}
            fields={[
              { key: "goal", label: "Goal", type: "textarea" },
              { key: "status", label: "Status", type: "select", options: GOAL_STATUS_OPTIONS },
              { key: "notes", label: "Notes", type: "textarea" },
            ]}
            emptyRow={{ goal: "", status: "emerging", notes: "" }}
            addLabel="+ Add goal"
          />
        ) : p.goalProgress?.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {p.goalProgress.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, minWidth: 92, textAlign: "center", textTransform: "uppercase", fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", padding: "3px 9px", borderRadius: 6, background: (GOAL[g.status] || NEUTRAL).bg, color: (GOAL[g.status] || NEUTRAL).color }}>{g.status}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#24344F", lineHeight: 1.45 }}>{g.goal}</div>
                  {g.notes && <div style={{ fontSize: 12, color: "#7C8DA8", lineHeight: 1.5, marginTop: 2 }}>{g.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>
        )}
      </Field>
      <Field label="Next session focus">
        {editable ? (
          <EditText value={p.nextSessionFocus ?? ""} onChange={(v) => set("nextSessionFocus", v)} rows={2} />
        ) : (
          <Para>{p.nextSessionFocus}</Para>
        )}
      </Field>
      <Field label="Barriers">
        {editable ? (
          <EditList value={p.barriers ?? []} onChange={(v) => set("barriers", v)} placeholder="Add a barrier" />
        ) : (
          <List items={p.barriers} />
        )}
      </Field>
      <Field label="Recommendations">
        {editable ? (
          <EditList value={p.recommendations ?? []} onChange={(v) => set("recommendations", v)} placeholder="Add a recommendation" />
        ) : p.recommendations?.length ? (
          <List items={p.recommendations} />
        ) : null}
      </Field>
      <Field label="Treatment effectiveness">
        {editable ? (
          <EditText value={p.treatmentEffectiveness ?? ""} onChange={(v) => set("treatmentEffectiveness", v)} rows={3} />
        ) : p.treatmentEffectiveness ? (
          <Para>{p.treatmentEffectiveness}</Para>
        ) : null}
      </Field>
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#7C93B8", margin: "0 0 6px" }}>Reassessment</p>
        {editable ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!p.reassessmentRecommended}
              onChange={(e) => set("reassessmentRecommended", e.target.checked)}
            />
            Recommended
          </label>
        ) : p.reassessmentRecommended ? (
          <span style={{ display: "inline-flex", alignItems: "center", background: "#FBF2DA", color: "#A9821F", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>
            Recommended
          </span>
        ) : (
          <span style={{ fontSize: 13, color: "#8298BC" }}>Not recommended at this time</span>
        )}
      </div>
    </div>
  );
}

export function DocumentationBody({ payload: p }) {
  if (!p?.soap) return null;
  const { soap } = p;
  return (
    <div>
      {[
        ["Subjective", soap.subjective],
        ["Objective", soap.objective],
        ["Assessment", soap.assessment],
        ["Plan", soap.plan],
      ].map(([label, val]) => (
        <Field key={label} label={label}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "#41557A", whiteSpace: "pre-wrap", margin: 0 }}>{val}</p>
        </Field>
      ))}
      {p.riskStatement && (
        <Field label="Risk statement">
          <Para>{p.riskStatement}</Para>
        </Field>
      )}
      <Field label="Follow-up">
        <List items={p.followUp} />
      </Field>
      {p.cptHint && (
        <Field label="Suggested code">
          <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>{p.cptHint}</p>
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
