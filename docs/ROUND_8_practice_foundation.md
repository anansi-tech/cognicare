# Round 8 — Practice foundation: ownership re-root + dead-schema cleanup

> Branch `dev`, working dir `products/cognicare`. Two things in one pass because they touch the same
> models: (A) introduce the **Practice** entity as the ownership root so the data model is correct
> for 1-or-many clinicians from the start, and (B) delete the dead pre-agent schema the audit found.
> **Behavior must be identical for a solo user** (a solo counselor = a practice of one). Team features
> (invites, admin UI, seat enforcement) are NOT here — they come with Auth.js v5. This round only
> gets the *shape* right.

## Mental model (the whole point)

- Every account is a **Practice**. A solo counselor is a practice of one. No "solo mode" vs "team
  mode" — one design, N clinicians.
- `counselorId` today secretly means two things: **owner** and **assigned clinician**. For a solo
  practice they're the same person, so it was never noticed. Split them:
  - **`practiceId`** = ownership root (which practice owns this client/session/report).
  - **`counselorId`** = the assigned clinician (who's working with this client).
- In a practice-of-one, `practiceId`'s owner and the `counselorId` are the same human — nothing feels
  different. In a 3-clinician practice (the real near-term test: the owner's practice has 3
  therapists), they can differ.

---

## Part A — Practice entity + re-root

### A1. New model `src/models/practice.js`
```js
// Practice: the organization that owns clients/sessions/reports and holds the subscription.
// A solo counselor is a practice of one. Team membership/roles arrive with Auth.js v5.
import mongoose from "mongoose";

const practiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },          // e.g. "Jane Doe Counseling" or a group name
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Subscription lives at the practice level (the practice pays).
    stripeCustomerId: { type: String },
    stripeSubscriptionStatus: { type: String },      // trialing|active|past_due|canceled|...
    seats: { type: Number, default: 1 },             // paid clinician seats (enforced later, with Auth.js v5)
  },
  { timestamps: true }
);

export default mongoose.models.Practice || mongoose.model("Practice", practiceSchema);
```

### A2. User model — belong to a practice
`src/models/user.js`: add
```js
practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice" },
```
**Move the Stripe fields' source of truth to Practice.** Keep the User fields for now to avoid a
big-bang, but the **gate and webhook should read the Practice** going forward (A6/A7). Mark the
User-level stripe fields `// deprecated: subscription now lives on Practice` — a later cleanup removes
them once nothing reads them. (Don't delete this round; the billing routes change is enough churn.)

> `role` enum stays `["counselor","admin"]`. Auth.js v5 round will refine to owner/member; not now.

### A3. Client & Session — add `practiceId` as ownership root
`src/models/client.js` and `src/models/session.js`: add
```js
practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice", required: true, index: true },
```
Keep `counselorId` on both — it now means "assigned clinician," still required. (Also add `practiceId`
to `report.js` and `aiReport.js` ownership — see A5.)

### A4. Registration — auto-create the practice-of-one
`src/app/api/auth/register/route.js`: after creating the user, create their practice and link both
ways. New flow:
```js
const user = await User.create({ email, password: hashedPassword, name,
  licenseNumber: licenseNumber || null, specialization: specialization || "General Counseling",
  role: "counselor" });

const practice = await Practice.create({ name: `${name}'s Practice`, ownerId: user._id, seats: 1 });
user.practiceId = practice._id;
await user.save();
```
> The solo user never sees "practice" — the name is auto-derived and never shown unless/until team
> features exist. If you want, let them rename it later (not this round).

### A5. The ownership re-root (the 21 sites)
Today the ownership filter is `{ counselorId: user.id }` in ~21 places. The rule:

- **Ownership / visibility queries** (list my clients, can I see this client/session/report) →
  filter by **`practiceId: user.practiceId`**. This is what makes a practice's clinicians share the
  roster. In a practice-of-one it's equivalent to today.
- **Assignment / authorship writes** (who created this, who's assigned) → keep **`counselorId:
  user.id`**.
- **On create** (client, session): set **both** — `practiceId: user.practiceId` (owner) and
  `counselorId: user.id` (assigned clinician).

Concretely, per file type:
- `clients/route.js`: GET list → `{ practiceId: user.practiceId }`. POST create → set both
  `practiceId` and `counselorId`.
- `clients/[id]/route.js`, `sessions/route.js`, `sessions/[id]/route.js`, `ai-reports/*`,
  `consent-forms/*`, `reports/[id]`, `export`, `dashboard/stats`: change the ownership/visibility
  filter from `counselorId: user.id` → `practiceId: user.practiceId`.
- `report-utils.js` (`getClientSessions`, `persistReport`): persist `practiceId` on reports; query by
  `practiceId`.
- **Billing/invoicing files** (`stripe/create-payment-link`, `clients/[id]/billing`,
  `clients/[id]/invoices/*`): these guard "is this MY client" — change to `practiceId` so any
  clinician in the practice can invoice a practice client. (Confirm: client invoicing should be
  practice-scoped, not per-clinician. For a solo practice, no change.)

> `getCurrentUser()` must return `practiceId`. Update `src/lib/auth.js` so the session/user object
> includes `practiceId` (add it to the NextAuth callbacks/session). Without this, every re-rooted
> query breaks. **Do this first.**

### A6. Access gate reads the Practice
`src/lib/billing.js` `hasActiveSubscription` currently takes a user. Change the gate to check the
**practice's** status:
```js
export async function getPracticeStatus(practiceId) {
  const p = await Practice.findById(practiceId).lean();
  return p?.stripeSubscriptionStatus;
}
export function isActiveStatus(status) {
  return new Set(["trialing", "active", "past_due"]).has(status);
}
```
Update the app gate (dashboard shell / wherever it checks) to use the practice's status. For a solo
user this is identical behavior.

### A7. Billing routes + webhook → Practice
- `billing/checkout`: create/find the Stripe customer on the **Practice** (`practice.stripeCustomerId`),
  put `practiceId` in customer metadata, and `seats` drives Practice plan quantity.
- `billing/portal`: read `practice.stripeCustomerId`.
- `webhooks/stripe`: match on the **Practice** (`{ stripeCustomerId: sub.customer }` against Practice)
  and set `practice.stripeSubscriptionStatus`; also store `seats` from `sub.items.data[0].quantity`.

### A8. Migration for existing data (you + Sarah)
You have ~one real user and a couple of clients. A tiny one-off script (or inline in a `/api/dev`
route you delete after) to backfill:
```js
// for each existing user with no practiceId: create a practice-of-one, set ownerId, user.practiceId
// then set practiceId on all their clients/sessions/reports where practiceId is missing,
// derived from the doc's counselorId -> that user's practiceId.
```
Provide it as a script in `scripts/backfill-practices.mjs` run once with `node`. Idempotent (skip docs
that already have `practiceId`). After running, the `required: true` on `practiceId` won't break
existing data.

---

## Part B — Delete dead pre-agent schema (the audit findings)

Zero readers anywhere (verified by the schema audit). Delete:

**`client.js`:** `demographics`, `clinicalInfo`, `riskFactors`, `treatmentPlan`, `riskLevel`,
`lastReassessment`, `lastIntakeAssessment`.
**`session.js`:** `aiInteractions`.

Then remove any **writes** to these (e.g. if `ClientForm`/client create populates `clinicalInfo` or
`riskFactors`, delete that — it writes a field nothing reads). Grep:
`grep -rn "clinicalInfo\|treatmentPlan\|demographics\|aiInteractions\|lastReassessment\|lastIntakeAssessment" src --include=*.js --include=*.jsx | grep -v models/`
→ should be empty after. Note `riskFactors`/`riskLevel` still appear as **agent payload** fields
(`AgentReportBody`, `schemas.js`) — those are different and stay; only the *client model* fields go.

Keep (confirmed alive): `initialAssessment`, `billing`, `insurance`, `consentForms`, identity fields.

---

## Acceptance criteria

1. **Solo behaves identically:** register a new user → a Practice is auto-created, `user.practiceId`
   set; creating clients/sessions works exactly as before; dashboard, reports, LIAM, measures all
   still show the user's data. No visible change.
2. **Practice sharing works:** manually create a second user with the **same `practiceId`** (simulating
   the team feature that's not built yet) → they see the same client roster (ownership = practiceId).
   This proves the re-root without needing the invite UI.
3. Ownership queries use `practiceId`; create still stamps `counselorId` (assignment). `grep -rn "counselorId: user.id" src` remains only on **writes/assignment**, not visibility filters.
4. Billing: checkout/portal/webhook operate on the Practice; gate reads practice status. Solo
   subscription flow unchanged end to end.
5. Dead fields gone (grep above empty); app behaves identically (they were never read).
6. Backfill script run; existing user + Sarah have `practiceId`. `npm run lint` clean.

## Suggested commits

```
feat(cognicare): Practice model + auto practice-of-one on registration
feat(cognicare): re-root ownership to practiceId (visibility) vs counselorId (assignment)
refactor(cognicare): subscription + billing operate at practice level
refactor(cognicare): drop dead pre-agent schema (client clinical blocks, session.aiInteractions)
chore(cognicare): one-off backfill of practiceId for existing users/clients/sessions
```

## What's intentionally deferred to Auth.js v5

Inviting clinicians, the admin/team-management screen, owner-vs-member roles, and **enforcing active
clinicians ≤ paid seats** — all next round. This round only makes the model correct so those slot in
without a migration. Buying N seats still bills N (Round 7.2); provisioning N logins comes with the
invite flow.
