# Round 41 (Part A) — Shared editable framework for AI reports

> Branch `dev`, working dir `cognicare`. Foundation for making assessment/diagnostic/progress editable
> like treatment. NO new editable reports in this part — just the reusable machinery, proven by
> re-wiring the existing treatment editor onto it (so treatment behaves identically after). Parts B/C/D
> (assessment, diagnostic, progress) build on this. Prefer **textarea** over input everywhere — content
> is often long and single-line inputs are painful to read while editing.

## Goal of Part A
Three reusable pieces, then refactor treatment to use them (zero behavior change to treatment):
1. **Editable field primitives** (shared, textarea-first).
2. **A report edit/approve/autosave controller** (extracted from `ClientInsights`, generic over agentType).
3. **Backend:** the PATCH route generalized to any agentType + `status` on all report types.

## 1. Backend — generalize report editing (do first; everything depends on it)

### Schema
`src/models/aiReport.js`: `status` (enum draft/approved) currently effectively used only by treatment.
Confirm it exists for ALL agent types (it's one field on the shared model — just ensure no per-type
gating). Default `"draft"`. No new fields.

### PATCH route — remove the treatment hardcode
`src/app/api/clients/[id]/ai-reports/[reportId]/route.js` (line ~48) hardcodes
`agentType: "treatment"` in the lookup, so it rejects other reports. Generalize:
- Remove the `agentType: "treatment"` filter — match by `_id` + clientId + scope only.
- Keep scope-guard (`visibleClientIds`/`clientScope`) and audit logging.
- Still accept `{ payload, status }`; still only allow `status` ∈ {draft, approved}.
- The route now works for any report type. (Confirm GET sibling isn't treatment-gated either.)

## 2. Editable field primitives — shared, textarea-first
New file `src/components/ai/editable.jsx` exporting small controlled primitives. **All multi-line use
textarea, auto-sizing, full width.** These replace the ad-hoc inputs currently inline in
`TreatmentBody`.

```jsx
// editable.jsx
const BASE = "w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm";

export function EditText({ value = "", onChange, placeholder, rows = 2 }) {
  // textarea even for "short" text — long content shouldn't force horizontal scroll
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      rows={rows} className={`${BASE} resize-y`} />
  );
}

export function EditList({ value = [], onChange, placeholder }) {
  // per-row textarea + remove + "add" (move the existing EditableList here, swap input->textarea rows=2)
}

export function EditSelect({ value, onChange, options }) {
  // <select> for enums (risk level, goal status). options: [{value,label}]
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={BASE}>
      <option value="" disabled>Select…</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function EditRows({ value = [], onChange, fields, addLabel = "+ Add" }) {
  // repeating structured objects (goals, differentials, measure interpretation).
  // `fields` = [{ key, label, type: "text"|"textarea"|"select", options? }]
  // renders a bordered card per row with labeled controls + remove; "add" appends a blank row.
  // textarea for any free-text field; select for enums.
}
```
- `EditRows` + `EditSelect` are the new capability (treatment didn't need select; diagnostic/progress
  will). Build them now so B/C/D just declare their field config.
- Keep them dumb/controlled: value in, onChange out. No fetching, no status logic.

## 3. The edit/approve/autosave controller — extract + generalize
The logic in `ClientInsights` (isEditing, editedPayload, debounced autosave, saveState, approve) is
treatment-specific. Extract to a reusable hook `src/components/ai/useEditableReport.js`:

```js
// useEditableReport({ clientId, report, onUpdated })
// returns { isEditing, startEdit, edited, setEdited, saveState, approve, canEdit }
export function useEditableReport({ clientId, report, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState(null);
  const [saveState, setSaveState] = useState("idle");

  // seed edited from report.payload when entering edit / on draft
  useEffect(() => { if (report) setEdited(report.payload); }, [report?._id]);

  // debounced autosave while editing a draft (same logic as today), generic on report._id
  useEffect(() => { /* ...debounced PATCH { payload: edited } ... */ }, [edited, report, isEditing, clientId]);

  async function approve() { /* PATCH { payload: edited, status:"approved" }, setIsEditing(false) */ }
  function startEdit() { setEdited(report.payload); setIsEditing(true); }
  const canEdit = report?.status === "draft" || isEditing;
  return { isEditing, startEdit, edited, setEdited, saveState, approve, canEdit };
}
```
- Move `SaveIndicator` into `editable.jsx` (shared) too.
- It's agentType-agnostic — works for any report doc with `{_id, payload, status}`.

## 4. Refactor treatment onto the new framework (proof — zero behavior change)
- `ClientInsights` treatment section: replace its inline isEditing/autosave/approve with
  `useEditableReport(...)`. Render the draft/approved bars + `SaveIndicator` + Approve from the hook's
  return. Behavior must be identical to now (draft autosaves, Edit reopens approved, Approve signs off).
- `TreatmentBody`: replace its inline input/textarea/EditableList with the shared primitives
  (`EditText`, `EditList`, `EditRows` for goals). Goals become an `EditRows` with fields
  [goal: textarea, measurable: textarea, targetTimeframe: text]. Read mode unchanged.
- Delete the now-duplicated inline `EditableList`, `INPUT_CLS`/`INPUT_SM` from AgentReportBody if fully
  replaced (keep only what read-mode still needs).

> Net of Part A: treatment looks/works exactly the same, but now rides on shared primitives + a shared
> hook + a generalized backend. B/C/D become "declare fields + drop in the hook."

## Acceptance
1. PATCH route edits ANY report type (not just treatment); scope + audit intact; status limited to
   draft/approved.
2. `editable.jsx` exports EditText, EditList, EditSelect, EditRows, SaveIndicator — all textarea-based
   for free text (no single-line inputs for long content).
3. `useEditableReport` hook encapsulates isEditing/autosave/approve, generic over report.
4. Treatment refactored onto them with **identical** behavior (draft autosave, edit-after-approve,
   approve). Manually verify: edit a draft → autosaves; approve → read-only; Edit plan → reopens.
5. No assessment/diagnostic/progress editing yet (that's B/C/D).
6. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
refactor(cognicare): shared editable-report framework (primitives + hook + generalized PATCH); treatment on it
```

## Note
This is pure foundation — the only user-visible change is treatment goal fields using textareas (which
they largely already do). The win is that B/C/D are now small. Build + verify this before B.
