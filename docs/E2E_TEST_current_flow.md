# CogniCare — End-to-End Test (current architecture)

A walkthrough of the real flow as it exists today: **the therapist supplies observations; the agents
do the rest, automatically.** Built around a realistic client (Sarah Johnson). Two people get value
from this: you (does it work / is it smooth) and a clinician (is the AI output actually *good*).

---

## Before you start

- **Synthetic data only.** The OpenAI BAA + Zero-Data-Retention gate is still open — do **not** enter
  real client information. Sarah Johnson is invented; keep it that way.
- **Running locally:** `npm run dev`, MongoDB reachable, `OPENAI_API_KEY` set. The AI steps fail
  without the key.
- **Latency is expected.** Intake and post-session each run two `gpt-5.5` reasoning calls in
  sequence, so a "generating…" state of ~15–45s is normal. If it hangs past ~60s on a Vercel Hobby
  plan, that's the `maxDuration` ceiling we flagged, not a logic bug.
- **What "good" looks like** is called out per agent so a clinician can judge the substance.

---

## Phase 1 — Intake runs itself

**Step 1. Create the client.**
Dashboard → Add Client. Required: Name + Initial Assessment. Contact fields optional.

```
Name: Sarah Johnson
Initial Assessment: Client presents with generalized anxiety and periodic panic attacks that have
intensified over the past 3 months. Reports difficulty sleeping and concentrating at work. No prior
therapy. Denies suicidal ideation but feels overwhelmed. Recent job change and relocation are
significant stressors.
```
Save.

**Expect:** You land on Sarah's page. On **Overview**, with **no button pressed**, a calm state
appears — "Analyzing intake — building assessment and diagnosis…" — then resolves into the AI
clinical picture.

**Clinician check (Overview → assessment + diagnosis):**
- Risk level should be **moderate** (panic + overwhelm, but denies SI).
- Assessment should name anxiety + panic, the situational stressors, sleep/concentration.
- Diagnosis should land near **GAD (F41.1)**, likely with panic features as a differential/rule-out.
- *Is the reasoning sound? Would you have written something similar?*

**Watch for:** refreshing mid-run should **not** kick a second analysis; refreshing after it's done
should show the result, not re-run. (This is the magic moment — assessment with zero clicks.)

---

## Phase 2 — Baseline measure

**Step 2. Administer a measure.**
Progress tab → "Administer measure" → choose **GAD-7** (anxiety presentation) → Start → answer all 7
items as Sarah might (moderate-high) → Submit.

**Expect:** Server-scored result — total + severity band (e.g. 13 → "Moderate"). Because Sarah denies
self-harm, **no safety alert** should appear.

> **Safety-path check (do separately, not on Sarah):** administer a PHQ-9 on a throwaway synthetic
> client and answer the last item (self-harm) as anything above "Not at all." A calm destructive
> alert ("Safety item endorsed — consider a safety review") must appear. This is the most important
> single behavior in the app; verify it fires, and that the wording feels appropriate, not alarmist.

**Note:** a trend needs **two** administrations — after one, the trend chart says insufficient data.
That's expected; you'll see the line move in Phase 6.

---

## Phase 3 — Schedule a session; prep runs itself

**Step 3. Create a session.**
Add Session for Sarah → Type: Initial Assessment → Status: **Scheduled** → Save.
(There is no "title" field — that's intentional. If you aren't auto-taken to the session, open it
from Sarah's **Sessions** tab.)

**Expect:** On the scheduled session page, again with no button — "Preparing your session…" → a
treatment/prep view appears.

**Clinician check (pre-session/treatment):** for a first anxiety session, expect rapport-building +
psychoeducation + an evidence-based starting modality (CBT, breathing/relaxation), with measurable
goals. *Appropriate for session one?*

---

## Phase 4 — During the session: consult LIAM, measure in the room

**Step 4. Ask LIAM.**
Anywhere on Sarah's pages, press **⌘K** (or click **Ask LIAM** in the top bar). The sheet opens,
titled with Sarah's name.

Try:
- "Any prior risk flags for this client?" → should answer from her record (denies SI, moderate risk),
  ideally with a **Session/Report citation chip**. Click a chip → it should navigate to that record.
- "Good first-session CBT homework for her presentation?" → an evidence-based, specific suggestion.

**Watch for:** the reply **streams** in; chips are clickable and land on the right page. This is the
in-session copilot — does it feel fast and grounded in *her* data, not generic?

**Step 5. Administer a measure in the encounter.**
On the session page, the **Measures** card → administer GAD-7 again. It's tied to this session
automatically.

---

## Phase 5 — Complete the session; the note writes itself; you approve it

**Step 6. Document the session.**
Edit the session → Status: **Completed** → Notes:

```
Client appeared anxious, fidgeting throughout. Discussed job change and relocation as stressors.
Introduced breathing exercises; client found them helpful. Reports 3 panic attacks this week,
5–10 min each. Sleep disturbance continues. Agreed to practice breathing daily and track panic
attacks before next session.
```
Save.

**Expect:** On the session page, no button — "Writing the session note…" → a **Draft** SOAP note
appears, plus a progress report.

**Step 7. Review & approve the note.**
The note shows a **"Draft — not in record"** badge with editable Subjective / Objective / Assessment /
Plan. Edit anything that needs it → **Approve note** → badge flips to **Approved**, fields go
read-only.

**Clinician check (the SOAP draft):** *Is it documentation you'd be comfortable signing? Accurate to
the notes you entered? Defensible? Anything it invented?* This is the original pain point — judge it
honestly.

---

## Phase 6 — Follow-up: the trend moves, reassessment surfaces

**Step 8. Run a second session a week later.** Schedule another session, complete it with improved
notes (e.g. panic attacks down to 1, sleep improving), and administer **GAD-7** again with a lower
score (say 8).

**Expect:**
- **Progress tab → trend chart** now plots two points, shows direction **improved**, and notes a
  **reliable change** if the drop is ≥4 (e.g. 13 → 8).
- The post-session **progress** report should reference the movement.
- Ask LIAM "How is she progressing?" → it should now **cite the real trend** you entered.
- If the progress agent flags it, a calm **reassessment banner** appears on Sarah's page ("A
  reassessment is recommended before the next session") — passive, no button; the next session's prep
  will reassess.

---

## Scorecard

Tick the ones that land; anything that doesn't is a bug to send back.

- [ ] Intake populated assessment + diagnosis with **zero clicks** (Phase 1)
- [ ] Diagnosis/risk are **clinically reasonable** (clinician judgment)
- [ ] Measure scored server-side; **no** false safety alert for Sarah; alert **does** fire on the SI test
- [ ] Session prep generated itself on a scheduled session
- [ ] LIAM streamed, answered from Sarah's data, chips deep-linked
- [ ] In-session measure tied to the session
- [ ] Completing a session generated a **draft** note (no button); Approve worked
- [ ] The SOAP draft is **documentation a clinician would sign**
- [ ] Two measures → trend moved, reliable change flagged
- [ ] Reassessment banner appeared when warranted

The first, seventh, and eighth boxes are the ones that decide whether the product delivers on its
promise. If your wife ticks those three, you've built the thing.

---

## When you run it

Send me whatever breaks or feels off — wrong/empty output, a step that fights you, anything a
clinician winces at — and I'll trace it and spec the fix. After this passes, the remaining work is
infrastructure (pricing, auth/MFA, DB hardening, theme polish), none of which blocks getting your
wife's reaction to the clinical workflow now.
