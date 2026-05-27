# Round 16 — Intake form: the entry point, polished

> Branch `dev`, working dir `products/cognicare`. The intake form (ClientForm) is fundamentally
> sound — focused, doesn't cram billing into intake. This round: (1) delete the stale AI-processing
> state, (2) lightly structure the `initialAssessment` field that seeds all six agents, (3) switch
> `age` → date of birth, (4) modernize the gender field. Not a rebuild — targeted polish on the
> product's first-touch surface.

## Context (verified)

- `aiProcessing` state in ClientForm is **dead** — `setAiProcessing` is never called, so the
  "AI assessment in progress…" block never shows. Leftover from the pre-Round-4a synchronous flow;
  intake now runs via `AutoIntake` on the client page after navigation. Delete it.
- `age`/`gender` are read in 6 display sites (ClientDetail, ClientList, report view) + the report
  agent. `buildClientBlock` passes the whole client to agents, so a DOB→age compute flows through.

## Part 1 — Delete the dead AI-processing state

In `src/app/components/clients/ClientForm.js`: remove `aiProcessing` state, the
`aiProcessing ? "Processing..."` button text, and the `{aiProcessing && (...)}` block. The button
becomes `loading ? "Saving..." : "Save Client"`. (Intake AI runs on the client page after save —
`AutoIntake` already shows its own "Analyzing intake…" there. No AI messaging belongs on this form.)

> On save, navigate to the new client's page as today — that's where `AutoIntake` fires and the
> "Analyzing intake…" state correctly appears. Confirm the redirect goes to `/clients/[newId]`.

## Part 2 — Light-structured initial assessment (drives all six agents)

This single field seeds every agent — richer input = better output. Add gentle structure **without**
making it a rigid form. Approach: keep it ONE stored `initialAssessment` string, but guide its
composition with labeled optional sub-areas that concatenate, OR a single textarea with structured
placeholder/helper. Recommend the **concatenating sub-fields** approach for clarity:

Replace the single textarea with a small set of optional prompts (all freeform, none individually
required — but at least one must be filled to satisfy the existing "initial assessment required"):
- **Presenting concerns** (what brings them in) — textarea
- **Relevant history** (mental health / treatment / medical, as known) — textarea
- **Risk indicators** (SI/HI, safety concerns — or "none noted") — textarea
- **Current stressors / context** (situational factors) — textarea

On submit, concatenate filled sections into `initialAssessment` with clear headers, e.g.:
```
Presenting Concerns:
{...}

Relevant History:
{...}

Risk Indicators:
{...}

Current Stressors:
{...}
```
(Skip empty sections.) This gives the agents structured, labeled input (better assessments/risk
detection) while letting the therapist write as much or little as they want per section.

**Keep it visually light** — these are four modest textareas under one "Initial Clinical Assessment"
heading with a one-line intro ("A thorough note here improves the AI's assessment, diagnosis, and
treatment suggestions — write naturally; all sections are optional but more detail helps"). Don't make
them tall or required. The expert can dump everything in "Presenting concerns"; the novice gets
prompted on what matters.

> Edit case: when editing an existing client whose `initialAssessment` is a single blob (old format),
> show it in the first "Presenting concerns" box (or a single fallback textarea) so existing data
> isn't lost. Don't try to parse old blobs into sections.

## Part 3 — Age → Date of Birth

### Model `src/models/client.js`
Replace `age` with:
```js
dateOfBirth: { type: Date, required: true },
```
Add a small helper `src/lib/age.js`:
```js
export function ageFromDob(dob) {
  if (!dob) return null;
  const d = new Date(dob), now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}
```

### Form
Replace the age number input with a **date input** ("Date of birth"), required. Validate it's a real
past date.

### The 6 read sites — compute age from DOB
Update to use `ageFromDob(client.dateOfBirth)`:
- `ClientDetail.js:634` (Age display)
- `ClientList.js:200` (`{age} / {gender}`)
- `reports/[reportId]/view/page.js:150` (`{age} yrs`)
- `src/lib/ai/agents/report.js:22` (`age ${ageFromDob(client.dateOfBirth) ?? "n/a"}`)
- anywhere else `client.age` appears (grep `\.age\b` to be sure).

### Migration
Tiny one-off (or inline in an existing dev script): for clients with `age` but no `dateOfBirth`,
set an approximate DOB (Jan 1 of `currentYear - age`) so existing records don't break the
`required: true`. Note it's approximate. For the one synthetic client (Sarah), this is trivial.

## Part 4 — Inclusive gender

### Model
```js
gender: {
  type: String,
  required: true,
  enum: ["female", "male", "non-binary", "transgender", "other", "prefer-not-to-say"],
},
```
(Order female/male first is fine; the point is the expanded set.) Consider also an optional
`pronouns: { type: String }` free-text field — clinically useful in mental health, low cost. Add it
to the form as an optional input if it doesn't add much churn.

### Form
Replace the gender select options with the new enum; add the optional **Pronouns** text field.
Default to empty/`prefer-not-to-say` rather than `male` (the current default-to-male is itself a
small thing worth fixing).

### Display sites
`ClientDetail`/`ClientList`/report view render `client.gender` — they capitalize with `charAt(0)`,
which breaks on `non-binary`/`prefer-not-to-say` (renders "Non-binary" fine but "Prefer-not-to-say"
oddly). Add a tiny label map or render the stored value with a friendlier display
(`{ "prefer-not-to-say": "Prefer not to say", "non-binary": "Non-binary", ... }`). Small, but avoids
ugly capitalization.

## Acceptance criteria

1. No AI-processing UI on the intake form; saving navigates to the client page where `AutoIntake`
   shows "Analyzing intake…". `grep -rn "aiProcessing" src` → nothing.
2. Initial assessment is composed from labeled optional sections, concatenated into
   `initialAssessment` with headers; at least one section required; editing an old single-blob client
   doesn't lose data. The agents receive the structured text (verify an assessment run uses it).
3. DOB replaces age: form has a date-of-birth input; all 6 read sites show age computed via
   `ageFromDob`; existing client migrated. `grep -rn "\.age\b" src` → only the helper/compute, no raw
   `client.age`.
4. Gender offers the inclusive set + optional pronouns; display sites render friendly labels (no
   "Prefer-not-to-say" mangling). Default isn't "male".
5. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
refactor(cognicare): remove dead aiProcessing state from intake form
feat(cognicare): light-structured initial assessment (concatenated sections) for richer agent input
feat(cognicare): client date of birth replaces age (+ ageFromDob helper, migrate)
feat(cognicare): inclusive gender options + optional pronouns; friendly labels
```

## Next: dashboard, then dead-code audit
After intake: review the **dashboard/stats** surface (what it shows, whether it's scoped to the
practice/clinician correctly, whether the stats are meaningful or vestigial). Then the systematic
dead-code audit (report first, delete with evidence), then the landing/theme revamp, then PHI last.
