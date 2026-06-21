# Round 42 (Part B) — Assessment editable

> Branch `dev`, working dir `cognicare`. Make the Assessment report editable + approvable, using the
> Part A framework (`useEditableReport`, `editable.jsx` primitives, generalized PATCH). Assessment is
> the simplest of the three — all fields map to existing primitives, no structured rows. Mirror exactly
> how treatment is wired in `ClientInsights`.

## Field → primitive mapping (assessment payload)
- `riskLevel` (enum none/low/moderate/high/imminent) → **EditSelect**
- `clinicalObservations` (string) → **EditText** (textarea, rows ~4 — observations run long)
- `primaryConcerns`, `riskFactors`, `protectiveFactors`, `recommendedInstruments`,
  `immediateAttention`, `suggestedNextSteps` (string[]) → **EditList** each

## 1. AssessmentBody — add editable mode
`src/components/ai/AgentReportBody.jsx`, `AssessmentBody`: add `editable = false, onChange` props,
mirroring `TreatmentBody`'s signature. Add a `set(key, value)` helper:
```js
export function AssessmentBody({ payload: p, editable = false, onChange }) {
  if (!p) return null;
  const set = (k, v) => onChange?.({ ...p, [k]: v });
  // each Field: editable ? <EditX .../> : <existing read view>
}
```
- **Risk level:** `editable ? <EditSelect value={p.riskLevel} onChange={(v)=>set("riskLevel",v)}
  options={RISK_OPTIONS} /> : <StatusBadge map={RISK_BADGE} value={p.riskLevel} />`
  - Define `RISK_OPTIONS = [{value:"none",label:"None"},{value:"low",label:"Low"},
    {value:"moderate",label:"Moderate"},{value:"high",label:"High"},{value:"imminent",label:"Imminent"}]`.
- **Clinical observations:** `editable ? <EditText value={p.clinicalObservations}
  onChange={(v)=>set("clinicalObservations",v)} rows={4} /> : <p className="text-sm">…</p>`
- **Each list field:** `editable ? <EditList value={p.X ?? []} onChange={(v)=>set("X",v)}
  placeholder="Add…" /> : <List items={p.X} />`
- Import the primitives from `@/components/ai/editable`. Read mode unchanged.

## 2. ClientInsights — wire the Assessment section with the hook
Currently the Assessment section renders `<AgentReportBody agentType="assessment" payload={...} />`
read-only. Mirror the treatment wiring:
- Add `const ax = useEditableReport({ clientId, report: assessment, onUpdated: setAssessment });`
- In the Assessment `Section`, render:
  - the **draft / approved-editing bar** (status badge text + `SaveIndicator` + **Approve**) — copy the
    treatment bars, swap labels ("Assessment" instead of "Draft plan"). For a draft:
    "Draft — review & approve"; for approved+editing: "Editing — changes save automatically".
  - body: `ax.canEdit ? <AssessmentBody payload={ax.edited} editable onChange={ax.setEdited} />
    : (<><AssessmentBody payload={assessment.payload} /><button onClick={ax.startEdit}>Edit
    assessment</button></>)`
- Same structure as treatment — extract a small local helper if the bar markup is identical (optional;
  don't over-abstract for two uses, but if treatment+assessment+diagnostic+progress all repeat it,
  a shared `<EditApproveBar tx={..} label=".."/>` is worth it. Your call — a shared bar component is
  the clean move since C and D will repeat it too).

> Recommendation: extract `EditApproveBar` (draft/approved-editing bar + SaveIndicator + Approve) into
> `editable.jsx` now, take treatment + assessment onto it. C and D reuse it. Avoids 4 copies.

## 3. Status display
Assessment reports now carry draft/approved status. If the Section header shows nothing about
review state, optionally add a tiny "Draft"/"Approved" indicator (like treatment). Minor.

## Acceptance
1. Assessment renders read-only by default with an **Edit assessment** button.
2. Editing: risk level is a dropdown; clinical observations a multi-row textarea; all list fields are
   per-row editable lists. Long text never forces single-line horizontal scroll.
3. Edits autosave (SaveIndicator shows Saving…/Saved); **Approve** signs off → read-only; **Edit
   assessment** reopens an approved one. Identical UX to treatment.
4. Backend: assessment edits persist via the generalized PATCH (scope + audit intact).
5. Treatment behavior unchanged. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): editable + approvable Assessment report (on shared framework)
```

## Note
If you extract `EditApproveBar` here, Parts C (diagnostic) and D (progress) get even smaller. Diagnostic
is the hard one (differentials/criteria via EditRows + confidence enum); progress is medium
(measure interpretation + goal progress via EditRows). Assessment proves the simple path first.
