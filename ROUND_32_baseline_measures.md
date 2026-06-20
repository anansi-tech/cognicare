# Round 32 — Baseline measures at intake (+ assessment uses them)

> Branch `dev`, working dir `cognicare`. Industry-standard MBC: PHQ-9/GAD-7 are administered at intake
> as a **baseline** before/with the first contact, anchor all later trends, and inform the assessment.
> Today measures live only in the Progress tab (ongoing), with no baseline concept and the intake flow
> never prompts for them. This round: prompt for **in-app baseline measures at intake**, mark the first
> administration as baseline, and have the assessment explicitly use baseline severity. (Client-send /
> self-complete measures = separate later round.)

## What exists (verified)
- `MeasuresPanel({ clientId, sessionId })` is reusable; `MeasureForm` posts to
  `POST /api/clients/[id]/measures` ({ instrumentId, responses, sessionId }).
- `buildClientBlock` ALREADY feeds PHQ-9/GAD-7 trends into every agent's context — so the assessment
  agent already *sees* measures if they exist before it runs. The integration is mostly timing + a
  prompt nudge.
- `getTrend` orders oldest->newest; the first administration is naturally the baseline anchor.
- Consent gate (R29): `AutoIntake` only runs after consent signed/overridden.

## Design: opportunistic, not a hard gate
Baseline measures are **prompted but not required**. After consent clears at intake, surface a clear
"Administer baseline measures" step. If done before the assessment fires, the assessment includes them;
if the therapist skips, the assessment still runs (they can measure later). Consent stays the only hard
wall — don't gate the pipeline on measures (would frustrate the "assess now, measure later" case).

## 1. Mark the first administration as baseline
`src/models/measureAdministration.js`: add
```js
isBaseline: { type: Boolean, default: false },
```
`POST /api/clients/[id]/measures`: when creating, set `isBaseline: true` if there is no prior
administration of that `instrumentId` for the client (i.e. this is the first). Simple check:
```js
const priorCount = await MeasureAdministration.countDocuments({ clientId, instrumentId });
// ...create with isBaseline: priorCount === 0
```
(So the first PHQ-9 and first GAD-7 each become their own baseline. No manual flagging.)

## 2. Surface a baseline-measures step at intake
`src/app/components/clients/ClientDetail.js`, overview tab — after the consent status block and
**before/around `AutoIntake`**, when the client has **no measures yet**, show a clear intake card:
> "Baseline measures — Administer PHQ-9 and GAD-7 to establish a starting point. These inform the
> assessment and anchor progress tracking."
> + the existing `<MeasuresPanel clientId={clientId} />` (no sessionId = client-level baseline).

- Show this prominently at intake (no measures on file yet). Once at least one measure exists, it
  collapses into the normal Progress-tab experience (don't nag forever). A small "Add baseline
  measure" affordance is enough after the first.
- Measures remain fully available in the **Progress tab** for ongoing administration (unchanged).
- This is in-app/therapist-administered (the choice for this round). Client-send is a later round.

## 3. Let the assessment explicitly use baseline scores
The agent already receives trends. Two light touches so it actually leverages them:
- **Timing:** if baseline measures are administered at intake, ensure `AutoIntake` runs the assessment
  *after* they're saved (so the context includes them). Practically: after a baseline measure is saved
  in the intake card, trigger/allow the assessment (the `onDone`/refresh already re-runs context). If
  the therapist skips measures, assessment runs as today. Don't block.
- **Prompt:** `prompts/assessment.md` — add a line:
  "If baseline standardized measures (e.g. PHQ-9, GAD-7) are present in the record, incorporate the
  baseline scores and severity bands into your assessment of current severity and risk, and reference
  them explicitly. If they are absent, recommend administering them."

## 4. (Optional, small) Surface baseline in trends
`getTrend` / `MeasureTrend`: optionally tag the first point as "baseline" in the UI so the chart shows
where treatment started. Nice-to-have; the `isBaseline` flag makes it trivial. Skip if it adds churn.

## Acceptance
1. At intake (client with no measures), the overview shows a clear "baseline measures" step with the
   PHQ-9/GAD-7 form; administering one saves a client-level measure with `isBaseline: true`.
2. The first administration of each instrument is flagged baseline; subsequent ones are not.
3. If baseline measures are done before the assessment runs, the assessment text reflects the
   baseline severity (verify the prompt change + that context includes them). If skipped, assessment
   still runs.
4. Measures remain available in the Progress tab for ongoing tracking; the intake card doesn't nag
   once measures exist.
5. Consent remains the only hard gate (measures are not required to proceed).
6. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): baseline PHQ-9/GAD-7 at intake (isBaseline) + assessment incorporates baseline scores
```

## Next round (B)
Client-send measures: a tokenized client-portal measure flow + email (mirroring consent) so clients
self-complete PHQ-9/GAD-7 before intake.
