# CogniCare — User Guide

A plain-language guide for therapists using CogniCare. No technical knowledge needed.

> **Note:** While CogniCare is in pre-launch, use only **made-up practice clients** for testing — not
> real client information — until your practice confirms HIPAA compliance is in place.

---

## What CogniCare is

CogniCare is your AI clinical team. You bring the clinical observations and judgment; CogniCare
handles the time-consuming parts — assessments, treatment planning, progress tracking, and writing up
notes. Everything the AI produces is a **draft for you to review and approve**. You stay in control.

## Getting started

### Signing up

1. Go to the sign-up page and create your account (name, email, password, license info).
2. Optionally set your **practice name** (e.g. "Westside Counseling"). Leave it blank if you're a solo
   therapist — you can change it later in Settings.
3. Start your 14-day free trial when prompted, and choose a plan:
   - **Solo** — for an independent therapist.
   - **Practice** — for a group; you pay per clinician (seat).

### If you run a group practice

As the practice **owner**, you can invite colleagues:

1. Go to **Team**.
2. Make sure you have enough seats (buy more in Billing if needed).
3. Enter a colleague's email and send the invite. They get an email link to join your practice.
4. Each clinician gets their own login. **Clinicians see only the clients assigned to them; you (the
   owner) see everyone.** This protects client confidentiality.

## Adding a client

1. Click **Add Client**.
2. Enter their name, date of birth, and contact info.
3. Fill in the **Initial Clinical Assessment** — this is the most important part. The more detail you
   give (presenting concerns, relevant history, risk indicators, current stressors), the better every
   AI suggestion will be. Write naturally; the prompts are there to guide you.
4. Save.

**What happens next, automatically:** CogniCare immediately analyzes the intake and produces an
**Assessment** and **Diagnostic impression** on the client's Overview — no button to press. Give it a
moment; you'll see "Analyzing intake…" then the results appear.

## The client page

A client's record has five tabs:

- **Overview** — the AI clinical picture: assessment, diagnostic impression, treatment plan, and
  progress. Each section shows a summary you can expand for detail (Assessment is open by default).
  Also shows their contact info and who they're assigned to.
- **Sessions** — all their sessions; create new ones here.
- **Progress** — administer measures (PHQ-9, GAD-7) and see trends over time.
- **Reports** — compile and export clinical reports.
- **Billing & Consent** — invoices and consent forms for this client.

## Running a session

1. **Schedule it:** from Sessions (or the Calendar), create a session. Set the date/time and type. For
   a standing weekly/biweekly slot, use **Repeat** to create the whole series at once.
2. **Before the session:** open the scheduled session — CogniCare automatically prepares a
   **treatment/prep view** for you.
3. **During the session:** press **⌘K** (or **Ask LIAM**) anytime to open your in-session copilot.
   LIAM answers from *this* client's record — ask about prior risk flags, suggest homework, etc. You
   can also administer a measure right on the session page.
4. **After the session:** mark the session **Completed** and add your notes. CogniCare automatically
   drafts a **SOAP note** and a progress update.
5. **Review & approve:** the note appears as a **Draft**. Edit anything, then click **Approve** — it
   becomes part of the record. Nothing is final until you approve it.

## Measurement-based care

On the **Progress** tab (or during a session), administer standardized measures (PHQ-9 for depression,
GAD-7 for anxiety). CogniCare scores them and charts the trend over time. After two or more
administrations you'll see the direction of change and whether it's a *reliable* change.

If a safety item is endorsed (e.g. self-harm on the PHQ-9), CogniCare shows a clear safety alert.

### Reassessment recommended

If the progress agent sees stalling/worsening scores or a new risk signal, a calm **"Reassessment
recommended"** banner appears with the reason and an **Administer measures** button. Re-administering
the measures lets the AI re-evaluate progress and the treatment plan before the next session.

## Reports

On the **Reports** tab, generate a report for a date range. CogniCare synthesizes the period's clinical
records into a **narrative report** (not raw data). Review and edit the draft, then **download a PDF** —
suitable to share with a referring provider. (As with notes, you review before it's final.)

## Consent forms

1. On a client's **Billing & Consent** tab, create a consent form (general, telehealth, or minor).
2. CogniCare emails the client a secure link.
3. The client opens it on any device, reads the form, **types their name and agrees** — a legally valid
   e-signature. No printing or scanning.
4. A signed PDF is generated and stored; both you and the client can download it.
5. If a link expires before they sign, you can **resend** it.

## Scheduling & reminders

- Create one-off or **recurring** appointments.
- Clients automatically get an **email reminder** before their appointment.
- Mark sessions **cancelled** or **no-show** (with a reason); the client's overview tracks attendance.

## Billing

**Two separate things:**

- **Your subscription** (what you pay CogniCare) — managed in **Settings → Subscription** / the Billing
  page. Change plan, seats, or payment method via the Stripe portal.
- **Client invoices** (what your clients pay you) — created on a client's **Billing & Consent** tab,
  with optional Stripe payment links.

## Settings & profile

- **Profile** — your name, license, specialization, password.
- **Settings** — rename your practice (owner only), manage your subscription, export your data.

## A note on the AI

Every agent output — assessment, diagnosis, treatment plan, SOAP note, report — is **clinical decision
support**, drafted for your review. You are the clinician of record. Read, edit, and approve before
anything is finalized or shared.
