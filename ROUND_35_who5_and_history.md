# Round 35 — WHO-5 instrument (direction-aware) + assessment history view

> Branch `dev`, working dir `cognicare`. Two features: (1) add the WHO-5 Wellbeing Index as a scored
> instrument — but it's a WELLBEING scale (higher = better, opposite of PHQ-9/GAD-7), so thread a
> `direction` concept through scoring/trend/progress so a LOW or DROPPING WHO-5 reads as the concern;
> (2) an expandable per-client assessment **history** on the Progress tab (date, score, band, expand
> for item-by-item responses). The data is already fully stored — #2 is display-only.

## Part 1 — WHO-5 instrument (direction-aware)

### Instrument fixture `src/data/instruments/who5.json`
WHO-5: 5 items, response 0-5 (All of the time=5 ... At no time=0), raw 0-25, conventionally ×4 to
0-100. Lower = poorer wellbeing. Screening cutoff: ≤50 (%) / raw ≤13 suggests further assessment.
```json
{
  "id": "who5",
  "name": "WHO-5 Wellbeing Index",
  "construct": "Wellbeing",
  "direction": "wellbeing",
  "recallWindow": "Over the last 2 weeks",
  "stem": "Please indicate for each statement which is closest to how you have been feeling over the last two weeks.",
  "responseOptions": [
    { "label": "At no time", "value": 0 },
    { "label": "Some of the time", "value": 1 },
    { "label": "Less than half the time", "value": 2 },
    { "label": "More than half the time", "value": 3 },
    { "label": "Most of the time", "value": 4 },
    { "label": "All of the time", "value": 5 }
  ],
  "items": [
    { "id": "who5_1", "text": "I have felt cheerful and in good spirits" },
    { "id": "who5_2", "text": "I have felt calm and relaxed" },
    { "id": "who5_3", "text": "I have felt active and vigorous" },
    { "id": "who5_4", "text": "I woke up feeling fresh and rested" },
    { "id": "who5_5", "text": "My daily life has been filled with things that interest me" }
  ],
  "scoring": { "method": "sum", "min": 0, "max": 25, "percentageFactor": 4 },
  "bands": [
    { "min": 0, "max": 13, "label": "Poor wellbeing (screen for depression)" },
    { "min": 14, "max": 18, "label": "Below average wellbeing" },
    { "min": 19, "max": 25, "label": "Good wellbeing" }
  ],
  "reliableChange": 10,
  "criticalItems": []
}
```
> Bands are in RAW units (0-25). Note `direction: "wellbeing"` and `percentageFactor: 4`. PHQ-9/GAD-7
> have no `direction` field → default to `"distress"`.

### `direction` threaded through — the ONLY logic changes
1. **`src/lib/mbc/trend.js`** (the key fix). Today direction is hardcoded:
   `delta < 0 ? "improved" : "worsened"` — correct for distress, BACKWARDS for wellbeing. Make it
   respect the instrument:
   ```js
   const isWellbeing = inst.direction === "wellbeing";
   const direction = delta == null || delta === 0 ? (delta === 0 ? "unchanged" : "insufficient-data")
     : (isWellbeing ? (delta > 0 ? "improved" : "worsened")
                    : (delta < 0 ? "improved" : "worsened"));
   ```
   (i.e. for wellbeing, a rising score is improvement.) `reliableChange` already uses `Math.abs`, so
   that's fine.
2. **`prompts/progress.md`**: line ~9 says "lower = improvement for PHQ-9/GAD-7". Add: "For wellbeing
   measures (e.g. WHO-5), HIGHER = improvement and a low or falling score is the concern; a WHO-5 at
   or below the screening cutoff warrants further depression assessment." The progress agent receives
   the computed `direction` already, so this just keeps its prose correct.
3. **Scoring** (`score.js`): no change needed — it's a generic sum + band lookup; works for WHO-5 as
   long as bands are in raw units (they are). The 0-100% is display-only (Part below).

### Display the % (since clinicians expect it)
Where a WHO-5 score is shown (trend point label, history, results), if the instrument has
`percentageFactor`, also show `total * factor` as a percentage, e.g. "WHO-5: 16/25 (64%)". Small
formatting touch in the measure display components; gate on `inst.scoring.percentageFactor` so
PHQ-9/GAD-7 are unaffected.

### Make WHO-5 selectable
Wherever the instrument picker lists PHQ-9/GAD-7 (MeasureForm/MeasuresPanel), it should read from the
instrument registry so WHO-5 appears automatically. Confirm the registry (`getInstrument`/list) picks
up the new JSON; if the picker hardcodes ["phq9","gad7"], add "who5".

## Part 2 — Assessment history (display-only; data already stored)

`measureAdministration` already stores `responses[]`, `total`, `severityBand`, `flags`,
`administeredAt`, `isBaseline` — everything needed. The GET at
`src/app/api/clients/[id]/measures` returns administrations (confirm it returns the full list with
`responses`; if it currently trims to trend points, have it return the full docs or add a `?history=1`).

On the **Progress tab** (in `MeasuresPanel`, below the trend), add an **Administration History** list:
- Reverse-chronological, grouped or labeled by instrument. Each row: instrument name, date
  (`administeredAt`), score + band (+ % for WHO-5), baseline tag, and a safety-flag indicator if any.
- Each row **expandable** to show item-by-item responses: render the instrument's items against the
  stored `responses` — "Q1. {item text} — {responseOption label} ({value})". (Look up the label from
  the instrument's `responseOptions` by value.)
- Read-only. No editing past administrations.
- Scope: already client-scoped via the existing route guard.

> This is the "refer back later" feature — the therapist can open any past PHQ-9/GAD-7/WHO-5 and see
> exactly what the client answered and when.

## Acceptance
1. WHO-5 is administrable; scored as a sum (0-25) with correct bands; shown with the 0-100% too.
2. Trend/direction is correct for WHO-5: a RISING score = "improved", a falling/low score = concern
   (not backwards). PHQ-9/GAD-7 behavior unchanged.
3. Progress prompt reflects wellbeing direction; the progress agent doesn't call a high WHO-5 "severe".
4. Progress tab shows an administration history; each entry expands to item-level responses with dates;
   works for all three instruments.
5. `npm test` (add a who5 scoring/direction test), `npm run lint`, `npm run build` clean.

## Tests to add
`src/lib/mbc/score.test.js` / a trend test: WHO-5 all 5s → 25 raw / "Good wellbeing"; all 0s → 0 /
"Poor wellbeing"; and a trend test asserting a WHO-5 increase = "improved" while a PHQ-9 increase =
"worsened" (the direction fix).

## Commit
```
feat(cognicare): WHO-5 wellbeing index (direction-aware scoring/trend) + per-client assessment history view
```
