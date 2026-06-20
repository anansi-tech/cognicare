# Round 37 — Baseline measures card: WHO-5 fix + clearer "administered" + declutter

> Branch `dev`, working dir `cognicare`, `src/app/components/clients/ClientDetail.js` (baseline card,
> ~line 760-783). Three fixes from a screenshot review: (1) the "Administered:" line hardcodes
> PHQ-9/GAD-7 so WHO-5 never shows even when taken; (2) the card text + checkmarks are faint/unclear;
> (3) the intake card is visually cluttered (full result cards duplicate info).

## Fix 1 — Administered list must include all instruments (bug)
Line ~770 filters a hardcoded `[{id:"phq9"},{id:"gad7"}]`, so WHO-5 (and anything else) is dropped
from the "Administered:" summary even when administered. Drive it from the instrument registry:
```js
import { listInstruments } from "@/lib/mbc/instruments";  // if not already imported
// ...
{administeredInstruments.length > 0 && (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {listInstruments()
      .filter((i) => administeredInstruments.includes(i.id))
      .map((i) => (
        <span key={i.id} className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
          {/* short label: use a shortName if defined, else the id upper-cased or a trimmed name */}
          {i.shortName ?? i.id.toUpperCase()} <span aria-hidden>✓</span>
        </span>
      ))}
  </div>
)}
```
> Optionally add `"shortName": "PHQ-9" | "GAD-7" | "WHO-5"` to each instrument JSON for clean labels
> (the `name` fields are long, e.g. "Patient Health Questionnaire-9"). Small, worth it.

## Fix 2 — Clearer "administered" indicator (visibility)
Replace the faint `text-xs text-blue-600 ... ✓` run-on with the **green "pill" badges** above — each
administered instrument as a green rounded chip with a check. Green = done reads instantly and is far
more visible than tiny blue text with a trailing ✓. (This is the Fix-1 markup; it solves both.)

## Fix 3 — Card copy mentions all available measures, not just two
The heading text hardcodes "Administer PHQ-9 and GAD-7". Make it instrument-agnostic:
> "Administer baseline measures to establish a starting point. These inform the assessment and anchor
> progress tracking." (drop the specific "PHQ-9 and GAD-7" naming, since WHO-5 is also available and
> the picker lists them all).

## Fix 4 — Declutter: don't show full result cards inside the intake card
Per the screenshot, after administering, `MeasuresPanel` renders large per-instrument result cards
(score/band/"insufficient data for a trend") AND a history list — inside the blue baseline card,
which is a lot of duplicated detail during intake. For the **intake baseline card**, keep it lean:
- Show only the **administer control** (the picker + Start) and the **green administered-pills**
  (Fix 1/2) as confirmation.
- Do NOT render the full trend/result cards or history here — those belong on the **Assessments tab**
  (Round 36), which is their home. The intake card's job is just "administer baseline + confirm done."
- Implementation: `MeasuresPanel` likely takes (or should take) a `compact`/`hideHistory` prop. Add a
  prop so the intake usage renders **administer-only** (no result cards, no trend, no history), while
  the Assessments-tab usage renders the full experience. If a prop is too invasive, simplest
  alternative: in the intake card, render just the administer form + pills, and rely on the
  Assessments tab for results.

> Result: intake card = "Baseline measures" heading + lean instruction + administer picker + green
> done-pills. Clean. Full scores/trends/history live one place: the Assessments tab.

## Acceptance
1. Administering WHO-5 at intake shows a green "WHO-5 ✓" pill alongside PHQ-9/GAD-7 — no instrument
   missing. Driven by the registry, not a hardcoded pair.
2. Administered indicators are clearly visible (green pills, not faint blue text).
3. Card copy no longer implies only PHQ-9/GAD-7.
4. The intake baseline card is lean (administer + pills); full result/trend/history cards do NOT
   render inside it — they're on the Assessments tab.
5. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
fix(cognicare): baseline card — registry-driven administered pills (incl WHO-5), clearer indicators, declutter intake
```
