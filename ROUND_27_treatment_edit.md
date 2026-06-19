# Round 27 — Make the treatment draft editable (UI only)

> Branch `dev`, working dir `cognicare`. Round 26 shipped the draft badge + Approve but NOT editing —
> `TreatmentBody` is read-only and `approveTreatment` only sends status. The backend already supports
> edits (the PATCH route at `ai-reports/[reportId]` accepts `{ payload, status }`, scope-guarded +
> audited). So this is **UI only**: add an edit mode to the treatment draft, mirroring the SOAP-note
> pattern.

## What exists
- `PATCH /api/clients/[id]/ai-reports/[reportId]` already accepts `payload` edits + `status:"approved"`,
  guarded by `visibleClientIds`, audited. **No backend change needed.**
- `ClientInsights.approveTreatment(reportId)` PATCHes only `{ status: "approved" }`.
- `TreatmentBody` renders the plan read-only.

## The change (in ClientInsights + a draft-aware editable treatment view)

When the treatment report is a **draft**, render editable fields with **Save** and **Approve**; when
approved, render read-only (current `TreatmentBody`). Mirror `SessionNote.jsx` (its SOAP edit pattern).

### Editable fields (the treatment payload)
- `approach` — text input
- `goals[]` — each: `goal`, `measurable`, `targetTimeframe` (text inputs; allow add/remove a goal)
- `interventions[]`, `homework[]`, `referrals[]` — editable lists (textarea-per-line is simplest:
  one item per line, split on save)
- `reviewCadence` — text input
- `changeSummary` — show read-only if present (it's the agent's note; don't let editing rewrite history)

### Behavior
- Draft state shows the fields in editable controls, pre-filled from `treatment.payload`.
- **Save** → `PATCH { payload: <editedPayload> }` → stays draft, updates local state. (Lets her edit
  across sittings without approving.)
- **Approve** → `PATCH { payload: <editedPayload>, status: "approved" }` → send any unsaved edits
  AND approve in one call, then render read-only. (So she can edit + approve in one go.)
- Keep the "Draft v{n} — review & approve" badge.

### Implementation approach
Two clean options — pick the simpler for the codebase:
- **A (recommended):** make `TreatmentBody` accept an `editable` prop + `onChange`. When editable,
  render inputs instead of `<p>`/`<List>`. ClientInsights owns the edited-payload state, Save/Approve
  buttons, and the PATCH calls. Keeps one component for both modes.
- **B:** a separate `TreatmentEditor` component for the draft state; `TreatmentBody` stays read-only
  for approved. More files, clearer separation.

Reuse `@/components/ui/textarea` and the input styling from `UserForm`/`SessionNote` (tokenized).

### List editing (keep it simple)
For `interventions`/`homework`/`referrals`/`goals`, a textarea where each line = one item is the
least-fiddly editor. On save, `value.split("\n").map(s=>s.trim()).filter(Boolean)`. Goals are objects,
so either three inputs per goal row (with +/- to add/remove) or, if that's heavy for v1, a simpler
"goal — measurable (timeframe)" single-line-per-goal parse. Prefer the structured rows if not too
much; the simple parse is an acceptable v1.

## Acceptance
1. A draft treatment plan shows **editable** fields (approach, goals, interventions, homework,
   referrals, review cadence), pre-filled.
2. **Save** persists edits and keeps it a draft; reload shows the edits.
3. **Approve** persists any edits + marks approved; fields become read-only.
4. `changeSummary` (on revisions) shown read-only, not editable.
5. Approved plans render read-only as before. Scope/audit unchanged (backend already handles).
6. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): editable treatment draft — edit fields then save/approve (UI)
```
