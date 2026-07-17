// Presentational renderers for each agent's report payload. Single source of truth —
// when an envelope payload shape changes in schemas.js, edit ONLY this file.
//
// Editable contexts use INLINE PER-FIELD editing: the body always renders as
// the read-mode document; each field is wrapped in InlineField (hover pencil →
// edit that field in place). PIN 1: field edits merge into the FULL payload via
// onChange and save through useEditableReport's existing debounced PATCH — no
// per-field endpoints, no partial payloads (payloadHash reconciliation
// depends on it).

import {
  InlineEditScope, InlineField, InlineText, InlineList, InlineEnum,
  EditRows, DiagnosisCandidateEditor, DiagnosisCandidateList,
} from "@/components/ai/editable";

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

// Read-mode field OR inline-editable field — same read content either way.
const IF = ({ editable, label, value, onChange, read, editor, bare }) =>
  editable ? (
    <InlineField id={label} label={label} value={value} onChange={onChange} read={read} editor={editor} bare={bare} />
  ) : (
    <Field label={label}>{read}</Field>
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
  const listField = (label, key, placeholder) => (
    <IF
      editable={editable}
      label={label}
      value={p[key]}
      onChange={(v) => set(key, v)}
      read={<List items={p[key]} />}
      editor={<InlineList value={p[key] ?? []} onChange={(v) => set(key, v)} placeholder={placeholder} />}
    />
  );
  const body = (
    <div>
      <IF
        editable={editable}
        label="Risk level"
        value={p.riskLevel}
        onChange={(v) => set("riskLevel", v)}
        bare
        read={
          <span style={{ textTransform: "uppercase", fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", padding: "3px 9px", borderRadius: 6, background: (SEV[p.riskLevel] || NEUTRAL).bg, color: (SEV[p.riskLevel] || NEUTRAL).color }}>
            {p.riskLevel}
          </span>
        }
        editor={({ commit }) => (
          <InlineEnum value={p.riskLevel} onChange={(v) => set("riskLevel", v)} options={RISK_OPTIONS} colors={SEV} onDone={() => commit()} />
        )}
      />
      {listField("Primary concerns", "primaryConcerns", "Add a concern")}
      {listField("Risk factors", "riskFactors", "Add a risk factor")}
      {listField("Protective factors", "protectiveFactors", "Add a protective factor")}
      {listField("Recommended instruments", "recommendedInstruments", "Add an instrument")}
      {listField("Immediate attention", "immediateAttention", "Add an item")}
      <IF
        editable={editable}
        label="Clinical observations"
        value={p.clinicalObservations}
        onChange={(v) => set("clinicalObservations", v)}
        read={<Para>{p.clinicalObservations}</Para>}
        editor={<InlineText value={p.clinicalObservations ?? ""} onChange={(v) => set("clinicalObservations", v)} rows={4} />}
      />
      {listField("Suggested next steps", "suggestedNextSteps", "Add a next step")}
    </div>
  );
  return editable ? <InlineEditScope>{body}</InlineEditScope> : body;
}

export function DiagnosticBody({ payload: p, editable = false, onChange }) {
  if (!p) return null;
  const set = (k, v) => onChange?.({ ...p, [k]: v });
  // Swap a differential into the primary slot. The displaced primary stays a
  // differential — a hypothesis you've ranked lower, not one you've discarded.
  const promote = (i) => {
    const next = p.differentials[i];
    const rest = p.differentials.filter((_, j) => j !== i);
    onChange?.({
      ...p,
      primaryDiagnosis: next,
      differentials: p.primaryDiagnosis ? [...rest, p.primaryDiagnosis] : rest,
    });
  };
  // PIN 2: "Make primary" keeps a read-mode home — hover-revealed on the
  // differential card (same reveal pattern as field pencils, focusable).
  const Dx = ({ d, action }) =>
    d ? (
      <div className="group" style={{ position: "relative", border: "1px solid #E7EEF7", background: "#F9FBFE", borderRadius: 12, padding: "12px 14px" }}>
        {action && (
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" style={{ position: "absolute", top: 9, right: 10 }}>
            {action}
          </div>
        )}
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
  const MakePrimary = ({ i }) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); promote(i); }}
      style={{ border: "1px solid #C7DCF5", background: "#fff", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#2F80FF", padding: "3px 10px" }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #2F80FF")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      Make primary
    </button>
  );
  const dxList = (items) =>
    items?.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((d, i) => (
          <Dx key={i} d={d} />
        ))}
      </div>
    ) : (
      <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>
    );
  const body = (
    <div>
      <IF
        editable={editable}
        label="Primary diagnosis"
        value={p.primaryDiagnosis}
        onChange={(v) => set("primaryDiagnosis", v)}
        read={<Dx d={p.primaryDiagnosis} />}
        editor={<DiagnosisCandidateEditor value={p.primaryDiagnosis ?? {}} onChange={(v) => set("primaryDiagnosis", v)} />}
      />
      <IF
        editable={editable}
        label="Differentials"
        value={p.differentials}
        onChange={(v) => set("differentials", v)}
        read={
          p.differentials?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {p.differentials.map((d, i) => (
                <Dx key={i} d={d} action={editable ? <MakePrimary i={i} /> : null} />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>
          )
        }
        editor={<DiagnosisCandidateList value={p.differentials ?? []} onChange={(v) => set("differentials", v)} onPromote={promote} />}
      />
      <IF
        editable={editable}
        label="Rule out"
        value={p.ruleOut}
        onChange={(v) => set("ruleOut", v)}
        read={<List items={p.ruleOut} />}
        editor={<InlineList value={p.ruleOut ?? []} onChange={(v) => set("ruleOut", v)} placeholder="Add a rule-out" />}
      />
      <IF
        editable={editable}
        label="Comorbidities"
        value={p.comorbidities}
        onChange={(v) => set("comorbidities", v)}
        read={dxList(p.comorbidities)}
        editor={<DiagnosisCandidateList value={p.comorbidities ?? []} onChange={(v) => set("comorbidities", v)} addLabel="+ Add comorbidity" />}
      />
      <IF
        editable={editable}
        label="Cultural considerations"
        value={p.culturalConsiderations}
        onChange={(v) => set("culturalConsiderations", v)}
        read={<List items={p.culturalConsiderations} />}
        editor={<InlineList value={p.culturalConsiderations ?? []} onChange={(v) => set("culturalConsiderations", v)} placeholder="Add a consideration" />}
      />
      <IF
        editable={editable}
        label="Clinical justification"
        value={p.clinicalJustification}
        onChange={(v) => set("clinicalJustification", v)}
        read={<Para>{p.clinicalJustification}</Para>}
        editor={<InlineText value={p.clinicalJustification ?? ""} onChange={(v) => set("clinicalJustification", v)} rows={4} />}
      />
    </div>
  );
  return editable ? <InlineEditScope>{body}</InlineEditScope> : body;
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

  const listField = (label, key, placeholder) => (
    <IF
      editable={editable}
      label={label}
      value={p[key]}
      onChange={(v) => set(key, v)}
      read={<List items={p[key]} />}
      editor={<InlineList value={p[key] ?? []} onChange={(v) => set(key, v)} placeholder={placeholder} />}
    />
  );

  const goalsRead = p.goals?.length ? (
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
  );

  const body = (
    <div>
      {p.changeSummary && (
        <div style={{ background: "#FBF2DA", border: "1px solid #F6D87A", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: "#A9821F", marginBottom: 4 }}>
          <span style={{ fontWeight: 700 }}>What changed: </span>{p.changeSummary}
        </div>
      )}
      <IF
        editable={editable}
        label="Approach"
        value={p.approach}
        onChange={(v) => set("approach", v)}
        read={<Para>{p.approach}</Para>}
        editor={<InlineText value={p.approach ?? ""} onChange={(v) => set("approach", v)} rows={2} />}
      />
      <IF
        editable={editable}
        label="Goals"
        value={p.goals}
        onChange={(v) => set("goals", v)}
        read={goalsRead}
        editor={
          <EditRows
            value={p.goals ?? []}
            onChange={(v) => set("goals", v)}
            fields={GOAL_FIELDS}
            addLabel="+ Add goal"
            emptyRow={{ goal: "", measurable: "", targetTimeframe: "" }}
          />
        }
      />
      {listField("Interventions", "interventions", "Add an intervention")}
      {listField("Homework", "homework", "Add a homework item")}
      {listField("Referrals", "referrals", "Add a referral")}
      <IF
        editable={editable}
        label="Review cadence"
        value={p.reviewCadence}
        onChange={(v) => set("reviewCadence", v)}
        read={<Para>{p.reviewCadence}</Para>}
        editor={<InlineText value={p.reviewCadence ?? ""} onChange={(v) => set("reviewCadence", v)} rows={2} />}
      />
    </div>
  );
  return editable ? <InlineEditScope>{body}</InlineEditScope> : body;
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

  const measuresRead = p.measureInterpretation?.length ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {p.measureInterpretation.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <MeasureScoreHeader m={m} />
          {m.interpretation && <span style={{ fontSize: 12.5, color: "#7C8DA8", lineHeight: 1.5 }}>{m.interpretation}</span>}
        </div>
      ))}
    </div>
  ) : (
    <p style={{ fontSize: 13, color: "#8298BC" }}>
      No standardized measures recorded for this period.
    </p>
  );

  const goalProgressRead = p.goalProgress?.length ? (
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
  );

  const body = (
    <div>
      {p.measureInterpretation?.length ? (
        <IF
          editable={editable}
          label="Measure interpretation"
          value={p.measureInterpretation}
          onChange={(v) => set("measureInterpretation", v)}
          read={measuresRead}
          editor={
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {p.measureInterpretation.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <MeasureScoreHeader m={m} />
                  {/* Scores are objective data — only the clinical interpretation text is editable. */}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <InlineText
                      autoFocus={i === 0}
                      value={m.interpretation ?? ""}
                      rows={2}
                      onChange={(v) =>
                        set("measureInterpretation",
                          p.measureInterpretation.map((x, j) => (j === i ? { ...x, interpretation: v } : x))
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          }
        />
      ) : (
        <Field label="Measure interpretation">{measuresRead}</Field>
      )}
      <IF
        editable={editable}
        label="Goal progress"
        value={p.goalProgress}
        onChange={(v) => set("goalProgress", v)}
        read={goalProgressRead}
        editor={
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
        }
      />
      <IF
        editable={editable}
        label="Next session focus"
        value={p.nextSessionFocus}
        onChange={(v) => set("nextSessionFocus", v)}
        read={<Para>{p.nextSessionFocus}</Para>}
        editor={<InlineText value={p.nextSessionFocus ?? ""} onChange={(v) => set("nextSessionFocus", v)} rows={2} />}
      />
      <IF
        editable={editable}
        label="Barriers"
        value={p.barriers}
        onChange={(v) => set("barriers", v)}
        read={<List items={p.barriers} />}
        editor={<InlineList value={p.barriers ?? []} onChange={(v) => set("barriers", v)} placeholder="Add a barrier" />}
      />
      {editable ? (
        <IF
          editable
          label="Recommendations"
          value={p.recommendations}
          onChange={(v) => set("recommendations", v)}
          read={p.recommendations?.length ? <List items={p.recommendations} /> : <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>}
          editor={<InlineList value={p.recommendations ?? []} onChange={(v) => set("recommendations", v)} placeholder="Add a recommendation" />}
        />
      ) : (
        <Field label="Recommendations">{p.recommendations?.length ? <List items={p.recommendations} /> : null}</Field>
      )}
      {editable ? (
        <IF
          editable
          label="Treatment effectiveness"
          value={p.treatmentEffectiveness}
          onChange={(v) => set("treatmentEffectiveness", v)}
          read={p.treatmentEffectiveness ? <Para>{p.treatmentEffectiveness}</Para> : <p style={{ fontSize: 13, color: "#8298BC" }}>None noted.</p>}
          editor={<InlineText value={p.treatmentEffectiveness ?? ""} onChange={(v) => set("treatmentEffectiveness", v)} rows={3} />}
        />
      ) : (
        <Field label="Treatment effectiveness">{p.treatmentEffectiveness ? <Para>{p.treatmentEffectiveness}</Para> : null}</Field>
      )}
      <IF
        editable={editable}
        label="Reassessment"
        value={p.reassessmentRecommended}
        onChange={(v) => set("reassessmentRecommended", v)}
        read={
          p.reassessmentRecommended ? (
            <span style={{ display: "inline-flex", alignItems: "center", background: "#FBF2DA", color: "#A9821F", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999 }}>
              Recommended
            </span>
          ) : (
            <span style={{ fontSize: 13, color: "#8298BC" }}>Not recommended at this time</span>
          )
        }
        editor={
          <label className="flex items-center gap-2 text-sm" style={{ color: "#41557A" }}>
            <input
              type="checkbox"
              checked={!!p.reassessmentRecommended}
              onChange={(e) => set("reassessmentRecommended", e.target.checked)}
            />
            Recommended
          </label>
        }
      />
    </div>
  );
  return editable ? <InlineEditScope>{body}</InlineEditScope> : body;
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
