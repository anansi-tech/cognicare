# Round 33 — Therapist-controlled intake (manual assessment trigger + re-run on edit)

> Branch `dev`, working dir `cognicare`. Fix three intake-flow problems that share one root cause: the
> assessment auto-fires the instant consent clears, conflating "consented" with "ready to assess."
> Make intake **therapist-controlled**: administer any number of baseline measures + confirm/edit
> notes, then click **Run intake assessment**. Editing notes later prompts a re-run. Replaces the
> auto-fire `AutoIntake`.

## Problems (verified)
1. Baseline card hides after ONE measure (`hasMeasures === false`), so you can't easily add GAD-7
   after PHQ-9.
2. Assessment fires immediately on consent (`shouldRun: loaded && !hasAssessment && canProcess`) — no
   time to administer measures first.
3. Editing `initialAssessment` does nothing — `AutoIntake` only fires when `!hasAssessment`, so a
   corrected note leaves a stale assessment. Industry standard: explicit therapist-triggered re-run,
   never silent auto-regenerate.

## 1. Baseline card: keep it through intake (fix Q1)
`ClientDetail.js`: the baseline card currently shows only while `hasMeasures === false`. Change so it
stays available during intake regardless of count — show it whenever the **assessment hasn't been run
yet** (intake phase), listing what's been administered + letting them add more (PHQ-9, GAD-7, others).
Once the assessment has been run, the card recedes (measures continue in the Progress tab).
- Track measures as a list/count, not a boolean. Show "Administered: PHQ-9 ✓, GAD-7 ✓" so the
  therapist sees what's done and can add the other.

## 2. Replace AutoIntake with a manual IntakeAssessment control (fix Q2)
Replace `<AutoIntake .../>` (used once, line ~672) with a new `IntakeAssessment` component that:
- Still respects the **consent gate**: if consent not signed/overridden, show the existing
  "Waiting for informed consent" state + Record-consent / Resend (carry this over from AutoIntake).
- Once consent is satisfied AND no assessment exists yet: show an intake-ready panel:
  > "Ready to generate the clinical picture. Administer any baseline measures first, then run the
  > assessment." + a **"Run intake assessment"** button.
- Clicking the button calls the intake workflow (reuse `useEnsureWorkflow`'s `run`/`retry`, but
  triggered by the click — set `shouldRun` false and call `retry()`/`run()` on click, OR refactor the
  hook to expose `run` directly). No auto-fire on mount.
- While running: the existing GeneratingState ("Analyzing intake — assessment, diagnosis, and initial
  treatment plan…"). On done: `onDone` refresh as today.
- Keep the failure/retry handling.

> Net: consent unblocks the *button*, not the *pipeline*. The therapist decides when intake is complete.

## 3. Re-run prompt when notes change after an assessment (fix Q3)
After an assessment exists, detect stale notes and offer re-run:
- The assessment report has `createdAt`; the client's intake notes change updates `client.updatedAt`
  (or track a dedicated `initialAssessmentUpdatedAt`). If the notes were edited *after* the latest
  assessment was generated, show a banner on the Overview:
  > "Intake notes changed since the last assessment. **Re-run assessment?**" + button.
- Clicking re-runs the intake workflow (same `run`), producing a fresh assessment/diagnostic/treatment
  (treatment already versions/supersedes from Round 26 — a re-run revises, good).
- **Never auto-re-run.** Editing notes only sets up the prompt; the therapist decides.
- Simplest reliable signal: compare `client.updatedAt` (or add `initialAssessmentUpdatedAt`, set in
  the PATCH when `initialAssessment` changes — cleaner, avoids false positives from unrelated edits)
  against the latest assessment report's `createdAt`. Prefer the dedicated timestamp.

## 4. Editing intake notes
Confirm `initialAssessment` is editable in the UI (the PATCH already allows it — `updateableFields`
includes `initialAssessment`). If there's no edit affordance on the Overview, add a small "Edit intake
notes" control so the therapist can correct them (which then triggers the #3 prompt). If editing
already exists (e.g. via the client edit form), just ensure it sets the notes-updated timestamp.

## Acceptance
1. At intake, the therapist can administer PHQ-9 AND GAD-7 (and more) — the baseline card doesn't
   vanish after one; it shows what's done until the assessment is run.
2. The assessment does NOT auto-fire on consent. A **Run intake assessment** button triggers it, after
   the therapist has done measures/notes. Consent still gates the button.
3. Editing intake notes after an assessment exists surfaces a **Re-run assessment?** prompt; re-running
   regenerates the pipeline. No silent auto-regeneration.
4. Consent-waiting state still works (record consent / resend).
5. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): therapist-controlled intake — manual assessment trigger + re-run-on-notes-change prompt
```

## Note
This makes the AI assist *when the clinician decides intake is complete*, not on a consent timer —
more intuitive and clinically correct. `AutoIntake` is retired (or repurposed as IntakeAssessment).
