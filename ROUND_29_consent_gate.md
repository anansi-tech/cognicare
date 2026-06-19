# Round 29 — Consent before processing: auto-send + gate the AI pipeline

> Branch `dev`, working dir `cognicare`. Two linked fixes: (1) auto-send the required consent form
> when a client is created (GrowTherapy-style — "sign before intake" becomes the default), and (2)
> **gate the AI pipeline on consent** — the assessment/diagnostic/treatment agents must NOT process a
> client's PHI until consent is signed OR the therapist explicitly overrides (consented live). This
> fixes the current bug where assessment auto-runs at client creation, processing PHI before any
> consent exists.

## Why
Informed consent (incl. the AI/data-handling disclosure) must precede processing the client's data.
Today `AutoIntake` fires as soon as a client is viewed without an assessment — i.e. immediately after
creation, before consent. Wrong order, clinically and for data handling.

## Current mechanics (verified)
- Trigger: `AutoIntake` runs when `loaded && !hasAssessment` (no assessment report yet) ->
  `useEnsureWorkflow({ type: "intake" })` -> `POST /api/ai/agent-workflow`.
- Consent send: `POST /api/consent-forms` builds template + token + emails the client. ConsentForm
  has `status: pending|signed|expired|revoked`, `type: general|telehealth|minor`.
- Client create: `POST /api/clients` -> `Client.create(body)`.

## 1. Extract a consent-create helper (reuse for auto-send)
Pull the form-creation logic out of `POST /api/consent-forms` into
`src/lib/consent.js` -> `createAndSendConsent({ clientId, practiceId, counselorId, type })`:
builds the template, token (+7d expiry), saves the ConsentForm (status "pending"), emails the client
the sign link. The existing route calls this; client-creation calls it too. (No behavior change to the
manual path.)

> Which form(s) to auto-send: default to the **general** informed-consent form. If the practice/client
> is telehealth, also/instead the telehealth one. Keep v1 simple: auto-send "general"; therapist can
> still manually send telehealth/minor from the consent tab as today.

## 2. Auto-send on client creation
`POST /api/clients`, after `Client.create(body)`: if the client has an email, call
`createAndSendConsent({ clientId: client._id, practiceId, counselorId, type: "general" })`.
Best-effort (don't fail client creation if email hiccups — try/catch, log). Audit the send.

## 3. Consent status the UI can read
Add `GET /api/clients/[id]/consent-status` (scope-guarded) returning:
```js
{ required: true, signed: <bool>, latest: { type, status, sentAt, signedAt } | null,
  overridden: <bool> }
```
`signed` = there exists a ConsentForm for this client with status "signed" (any required type).
`overridden` = the therapist marked consent obtained manually (see #5).

## 4. Gate the AI pipeline
`AutoIntake.jsx`: add a consent check to `shouldRun`. Fetch consent-status; only run intake when
consent is **signed or overridden**:
```js
const canProcess = consent?.signed || consent?.overridden;
const { generating, error, retry } = useEnsureWorkflow({
  shouldRun: loaded && !hasAssessment && canProcess,
  type: "intake", clientId, onDone,
});
```
When `!canProcess` and no assessment yet, render a **consent gate** instead of the generating state:
> "Waiting for informed consent. The AI clinical pipeline will begin once the client signs, or you can
> record consent obtained to proceed." + a **"Record consent obtained"** button (the override, #5) +
> a "Resend consent" link.

> Defense in depth (recommended): also guard server-side. In `POST /api/ai/agent-workflow` for
> `type: "intake"`, check the client has signed/overridden consent before running; 409 otherwise. So
> the gate isn't only client-side. Keep it simple — one check at the top of the intake branch.

## 5. Therapist override (the live-consent fallback)
Your wife's fallback: client didn't sign before intake, therapist consents them live. Add a way to
**record consent obtained**:
- `PATCH /api/clients/[id]/consent-status` (or a small field on the client / a ConsentForm marked
  signed-in-person) setting an override flag with `who` + `when`. Scope-guarded, audited.
- The "Record consent obtained" button in the gate calls it; once set, `canProcess` true, pipeline
  runs.
> Simplest storage: a `consentOverride: { by, at }` on the Client model, OR create a ConsentForm with
> status "signed" + a `signedInPerson: true` marker. Prefer the ConsentForm route so it shows in the
> consent list consistently. Implementer's call.

## 6. Visible consent status on the client
On the client header/overview, show a clear badge: **"Consent: signed"** (green) / **"Consent:
pending"** (amber) / **"Consent: recorded in person"**. Uses the consent-status endpoint. Makes the
state obvious at the moment it matters, not buried in a tab.

## Acceptance
1. Creating a client with an email auto-sends the general consent form (status pending); audited.
2. The AI pipeline does NOT run while consent is pending — the client Overview shows a consent gate,
   not agent output. Server also refuses an intake workflow without consent (409).
3. Client signs (or therapist clicks "Record consent obtained") -> pipeline runs -> assessment/
   diagnostic/treatment generate as before.
4. Consent status badge visible on the client (signed / pending / in-person).
5. Manual consent send (telehealth/minor) still works from the consent tab. Override is scoped+audited.
6. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): consent before processing — auto-send on creation + gate AI pipeline (signed or override)
```

## Note
This is both a workflow improvement (consent-before-intake default) and a data-handling correctness
fix (no PHI processing before consent). Directly relevant to the PHI/compliance track. The "general"
consent template should include the AI/data-handling disclosure (verify the template text covers
"this practice uses AI to assist in your care; here's how your data is handled").
