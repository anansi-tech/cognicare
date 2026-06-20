# Round 40 — Treatment edit-anytime + readable fields + terser, ranked agent output

> Branch `dev`, working dir `cognicare`. Four changes: (1) let the therapist edit an APPROVED treatment
> plan again (today approve = locked forever); (2) make edit fields readable (goals are cramped
> single-line inputs); (3) soft-cap + rank counts in the diagnostic/treatment prompts (industry norms);
> (4) terser agent output everywhere. Keep the edit/approve flow simple.

## 1. Edit anytime (re-edit after approve)
`src/app/components/clients/ClientInsights.js` (~150-180): editing is gated on
`treatment.status === "draft"`; approved plans render read-only with no way back.

Fix — a simple edit toggle, no new statuses:
- Add local `isEditing` state. Editable when `status === "draft"` OR the user clicked **Edit**.
- Approved + not editing: render read-only `AgentReportBody` + an **"Edit plan"** button.
- Clicking Edit → `isEditing = true`, seed `editedPayload` from the current payload, show the same
  editable `TreatmentBody` + Save / Approve (the existing draft controls).
- **Save** → PATCH `{ payload }` (stays current status). **Approve** → PATCH `{ payload, status:"approved" }`
  + `isEditing=false` → back to read-only.
- The amber "Draft vN — review & approve" bar shows for drafts; for an approved plan being edited, show
  a neutral "Editing — Save or Approve" bar. Keep it minimal.

> Net: draft OR approved, the therapist can always open it, edit, and re-approve. One toggle.

## 2. Readable edit fields (multiline, wider)
`src/components/ai/AgentReportBody.jsx`, `TreatmentBody` editable mode:
- **Goals** currently a 3-col grid of cramped `INPUT_SM` inputs — text scrolls off. Restructure each
  goal row to stack, with `goal` and `measurable` as **textareas** (2 rows, full width), and
  `targetTimeframe` a short single-line input (it's short, e.g. "8 weeks"):
  ```
  Goal:        [ textarea, w-full, rows=2 ]
  Measurable:  [ textarea, w-full, rows=2 ]
  Timeframe:   [ input, w-40 ]            [✕ remove]
  ```
  Use small inline labels per sub-field so it's clear which is which when stacked.
- **Approach**: keep single-line input but ensure `w-full` (it is).
- The list fields (interventions/homework/referrals) already use full-width textareas — leave them.
- Goal: every field shows most/all of its content without horizontal scrolling.

## 3. Soft-cap + rank counts (prompts only — flexible, not schema-enforced)
Edit the prompts to aim for ranked, focused output; agent may exceed if clinically warranted.

`prompts/treatment.md` — add:
> "Prioritize and rank. Aim for ~3-4 active, measurable goals (focus beats breadth); 3-5 concrete
> interventions tied to those goals; 1-3 realistic between-session homework items. Lead with the most
> important. Exceed these only when clinically necessary."

`prompts/diagnostic.md` — add:
> "Provide a primary diagnosis plus the top 2-3 differentials (ranked by likelihood) — not an
> exhaustive list. Limit rule-outs to the ~3 most relevant. Note the ~2-3 most salient cultural/
> contextual factors. Prefer the few highest-yield items over completeness."

`prompts/assessment.md` — add:
> "Rank and limit: lead with the ~3-5 most important primary concerns, the ~3 most salient risk and
> protective factors each, and the ~3 highest-priority next steps. Prefer the few highest-yield items
> over an exhaustive list."

`prompts/progress.md` — add:
> "Rank and limit: the ~3 most relevant barriers, the ~3 highest-priority recommendations, and ~2-3
> concrete follow-up items. Lead with what changed and what matters most."

> Soft caps via prompt — schema stays unconstrained (arrays remain `z.array`), so the agent can exceed
> when justified. No hard `max()` in schemas. Applied consistently across diagnostic, treatment,
> assessment, and progress so output feels even (not 4 goals next to 8 concerns).

## 4. Terser output everywhere (Occam's razor)
Add a shared instruction to the agent prompts (assessment, diagnostic, treatment, progress) — either a
line in each, or a shared preamble if one exists:
> "Be terse and clinically precise. Use the fewest words that fully convey the clinical meaning. No
> filler, no hedging boilerplate, no restating the prompt. Rank by importance and lead with what
> matters most."

> Check if there's a shared system preamble (`src/lib/ai/*` or a common prompt) to add this once;
> otherwise add the line to each of the 4-5 agent prompt files.

## Acceptance
1. An approved treatment plan can be re-opened via "Edit plan", edited, and re-approved — repeatedly.
   Draft flow unchanged.
2. Goal edit fields are multiline/wide — full content readable without horizontal scrolling.
3. Soft caps applied consistently across all four agents (verify on a fresh generation):
   - Diagnostic: primary + ~2-3 ranked differentials, ~3 rule-outs, ~2-3 cultural factors.
   - Treatment: ~3-4 goals, ~3-5 interventions, ~1-3 homework.
   - Assessment: ~3-5 primary concerns, ~3 risk/protective factors each, ~3 next steps.
   - Progress: ~3 barriers, ~3 recommendations, ~2-3 follow-up items.
4. Agent outputs read noticeably terser/ranked (subjective — eyeball a generated assessment/plan).
5. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): edit treatment plan anytime; readable multiline goal fields; ranked+terser agent output
```

## Note
Counts are soft (prompt-guided), so clinical judgment can override. The terseness instruction is the
single highest-leverage change for reducing the verbosity you flagged — it applies to every agent.
