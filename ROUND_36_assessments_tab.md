# Round 36 — Assessments tab (declutter) + LLM sees all instruments

> Branch `dev`, working dir `cognicare`. Three things: (1) rename the "Progress" tab to
> **"Assessments"** and give it a clear three-part layout (Administer / Trends / History); (2)
> declutter the **Overview** to a latest-score glance only; (3) **fix a real gap** — the LLM context
> hardcodes `["phq9","gad7"]`, so WHO-5 (and any future instrument) is invisible to the agents. Feed
> all instruments that have data.

## Part 1 — LLM sees all instruments (the correctness fix — do this regardless)
`src/lib/ai/context.js`: `buildClientBlock` defaults `instrumentIds = ["phq9", "gad7"]` — WHO-5 is
scored/shown but the assessment/progress/treatment agents never see it.

Fix: pull trends for **all** instruments that have at least one administration for the client.
```js
import { listInstruments } from "@/lib/mbc/instruments";
// ...
const allIds = listInstruments().map((i) => i.id);          // phq9, gad7, who5, ...
const trends = {};
for (const id of allIds) {
  const t = await getTrend(clientId, id, 6);
  if (t.points?.length) trends[id] = t;                     // only include instruments with data
}
```
(Skip empty ones so the prompt isn't padded with "insufficient-data" for unused instruments.) The
progress prompt already handles `direction`, so WHO-5 reasoning stays correct.

> This means a WHO-5 a therapist administers now actually informs the AI assessment/progress/treatment.

## Part 2 — Rename tab to "Assessments" (keep internal id "progress")
Lowest-risk rename: change the **label**, keep the internal tab id `"progress"` so existing
deep-links (`?tab=progress` from the reassessment banner), the `TAB_ALIAS` map, and validation all
keep working.

`ClientDetail.js`:
- Tab button (line ~667): label `Progress` -> **`Assessments`**.
- Add `assessments` to `TAB_ALIAS` -> `"progress"` (so `?tab=assessments` also works going forward):
  `const TAB_ALIAS = { insights: "overview", analytics: "progress", measures: "progress", assessments: "progress" };`
- Leave the internal id, the validation array, and `setActiveTab("progress")` calls as-is.

## Part 3 — Assessments tab: clear three-part layout
The tab content (currently `activeTab === "progress"` block, ~line 1009) holds the full measures
experience, organized into three labeled sections:
1. **Administer** — the `MeasuresPanel` administer form (PHQ-9 / GAD-7 / WHO-5 — reads the registry so
   WHO-5 shows automatically). Always available for ad-hoc administration.
2. **Trends** — the trend charts (per instrument with data).
3. **History** — the expandable administration history (from Round 35): each past administration with
   date, score, band (+ % for WHO-5), baseline tag, safety flag; expand for item-by-item responses.

Use clear section headings so the three intents are visually distinct (administer / glance at trend /
audit past responses). This is where the Round 35 history lives — moved out of wherever it currently
crowds, into its proper home.

## Part 4 — Declutter Overview to a latest-score glance
`ClientDetail.js` overview block (~line 720): the Overview currently renders measure cards with
scores/descriptions, which now duplicates the Assessments tab.
- Replace with a compact **latest-score glance**: one small line/stat per instrument-with-data —
  e.g. "PHQ-9: 11 · Moderate ↓" / "WHO-5: 16/25 (64%) · Good wellbeing ↑" — using the trend
  `direction` arrow. No charts, no history, no descriptions.
- Add a small "View assessments" link/button -> sets tab to Assessments (`setActiveTab("progress")`).
- **Preserve the intake baseline-measures card** (Round 32) exactly as-is — it shows during intake
  (before the assessment is run) so the therapist can administer baseline measures in-flow. Only the
  *post-intake* measure cards collapse to the glance. (The baseline card and the glance are different
  states: baseline card pre-assessment, glance once measures exist + assessment run.)

> Net: Overview = AI clinical picture + a one-line score glance. Assessments tab = the full measures
> home. No duplication. Intake administration unchanged.

## Acceptance
1. WHO-5 (and any instrument with data) is included in the LLM context; agents reason over it with
   correct wellbeing direction. `grep` shows no hardcoded `["phq9","gad7"]` in context.js.
2. The tab reads "Assessments"; `?tab=progress` AND `?tab=assessments` both land on it; the
   reassessment banner deep-link still works.
3. Assessments tab has clear Administer / Trends / History sections; WHO-5 administrable there.
4. Overview shows a compact latest-score glance (no charts/history), with a link to Assessments; the
   intake baseline card still works during intake.
5. Administering remains easy at intake (Overview card), ongoing (Assessments tab), and in-session
   (session page) — all three preserved.
6. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): Assessments tab (Administer/Trends/History) + Overview score glance; LLM sees all instruments
```
