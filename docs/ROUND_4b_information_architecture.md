# Round 4b — Information Architecture: fewer surfaces, in the right places

> Hand to Claude Code. Branch `dev`, working dir `products/cognicare`. You have the repo.
> Goal: a therapist should never wonder "which tab has the thing I need." Collapse the client page's
> seven tabs to five with no overlap, administer measures inside the session encounter, and drop the
> redundant mood rating. This is reorganization of existing components — do **not** rewrite the
> components themselves or change agent behavior (that was 4a).

## Target client-page tabs (7 → 5)

Current: overview · sessions · reports · insights · analytics · measures · consent-billing
Target:  **Overview · Sessions · Progress · Reports · Billing & Consent**

| New tab | Contains | Sourced from |
| --- | --- | --- |
| **Overview** | The AI clinical picture first (current risk, assessment, diagnosis, active treatment), then the client identity/contact summary already there | fold in `ClientInsights` (today's *insights* tab) above the existing overview content |
| **Sessions** | unchanged | today's *sessions* |
| **Progress** | measure administration + trends, and the risk timeline, together | merge today's *measures* (`MeasuresPanel`) + *analytics* (`ClientAnalytics`) |
| **Reports** | unchanged (compiled, exportable Report docs) | today's *reports* |
| **Billing & Consent** | unchanged content; just the label | today's *consent-billing* |

### Edits in `src/app/components/clients/ClientDetail.js`
- **Remove** the tab buttons and content blocks for `insights`, `analytics`, and `measures`.
- **Overview**: render `<ClientInsights ... />` at the **top** of the overview content (it's the most
  important thing on the page — what the AI concluded about this client), above the existing summary.
- **Add** a `progress` tab whose content is `<MeasuresPanel clientId={client._id} />` followed by
  `<ClientAnalytics ... />` (whatever props it currently takes). Title it "Progress".
- Rename the `consent-billing` tab **label** to "Billing & Consent" (keep the value/key as-is to avoid
  touching its content block).
- Keep `<AutoIntake>` and `<ReassessmentBanner>` where they are (page-level, not inside a tab).
- If any code reads the `?tab=` query param for the removed tab names (e.g. links that did
  `?tab=insights`), repoint them: `insights`/`analytics`/`measures` → `overview`/`progress`/`progress`.
  Grep: `grep -rn "tab=insights\|tab=analytics\|tab=measures\|activeTab === \"insights\"\|=== \"analytics\"\|=== \"measures\"" src`.

Don't restructure ClientDetail beyond moving these blocks. Minimal, surgical.

## Measures inside the session encounter

In real measurement-based care the instrument is given **at the session**, not as a separate errand.
`MeasuresPanel` already accepts a `sessionId`.

- In `src/app/components/sessions/SessionDetail.js`, render
  `<MeasuresPanel clientId={session.clientId} sessionId={session._id} />` in a clearly labeled
  "Measures" card on the session page (near the notes / `SessionNote`). Administrations done here are
  automatically tied to the session via `sessionId`, and the same trends show under the client's
  Progress tab.

## Drop the redundant mood rating

`moodRating` (a single 1–10 number) duplicates and competes with the real instruments. Remove it:

- `src/app/components/sessions/SessionForm.js`: remove the mood-rating field, its state
  (`moodRating: 5` default, the load mapping, and the input around the "Mood Rating" label).
- `src/app/components/sessions/SessionDetail.js`: remove the "Client Mood Rating" display block.
- `src/models/session.js`: remove the `moodRating` field.
- Grep: `grep -rn "moodRating\|Mood Rating" src` → nothing.

> If you'd rather keep a quick subjective check, that's a product call — but don't keep *both* a mood
> slider and the instruments. Default per this round: remove it; the measures are the signal.

## Acceptance criteria (smoke)

1. The client page shows exactly five tabs: Overview, Sessions, Progress, Reports, Billing & Consent.
2. Overview leads with the AI clinical picture (assessment/diagnosis/risk/treatment) via `ClientInsights`.
3. Progress shows the measure administer control + trends and the risk timeline in one place; the old
   `insights`/`analytics`/`measures` tabs are gone and no link 404s to a removed `?tab=`.
4. On a session page, a Measures card lets you administer PHQ-9/GAD-7; the administration is tied to
   that session and the new point appears in the client's Progress trends.
5. No mood-rating field on the session form, no mood display on the session page;
   `grep -rn "moodRating" src` → nothing; `npm run lint` clean.

## Suggested commits

```
refactor(cognicare): client page 7 tabs -> 5 (Overview/Sessions/Progress/Reports/Billing & Consent)
feat(cognicare): administer measures inside the session page
refactor(cognicare): drop redundant moodRating (measures are the signal)
```

## After 4b: the clean end-to-end test

With behavior (4a) and layout (4b) settled, I'll write the fresh E2E guide against the real flow —
create Sarah Johnson → intake runs itself → administer PHQ-9 → schedule + run a session → consult
LIAM mid-session → complete the session → review & approve the draft note → watch the trend move →
reassessment banner appears — and we smoke-test it together on synthetic data (PHI gate still open).
