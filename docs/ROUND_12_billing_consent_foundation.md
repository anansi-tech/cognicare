# Round 12 — Billing & Consent: fix the foundation

> Branch `dev`, working dir `products/cognicare`. Option A, simple invoicing (no insurance claims).
> Three things: (1) promote invoices from an embedded array to a real `Invoice` model with
> practice/assignment scoping + audit, (2) reconcile the **two** consent systems into one, (3) clean
> the billing IA naming. Folds in Claude Code's four scope/audit fixes — they become trivial once
> invoices are a real model. Synthetic data only; migration is for the one test client.

## Why (what the e2e + audit found)

- Invoices live **embedded in `client.billing.invoices[]`** — no Invoice model. Can't query across
  clients (unpaid this month, revenue, a clinician's invoices), can't scope/audit cleanly. This is
  why the scope filters were awkward (`status/route.js` uses a legacy `userId` filter;
  `verify-payment` fan-out fetches `/status`).
- **Two consent systems** coexist: the rich standalone `ConsentForm` model (`/api/consent-forms`,
  versioning + signed docs + history + expiry) AND an embedded `client.consentForms[]`
  (`/api/clients/[id]/consent-forms`). The UI **creates** via the standalone one but **deletes** via
  the embedded one — actively inconsistent. Keep the standalone model; retire the embedded array.
- "Billing" overloads patient invoicing and practice subscription. Already split at routes (R7); fix
  the naming/IA so it's unambiguous.

Decided scope: **simple invoicing** — client + sessions + amount + status. No CPT/claims/EDI. Keep
the existing `client.billing` rate/paymentMethod and `client.insurance` info fields (they're just
reference info the clinician reads); only the **invoices array** becomes a model.

---

## Part 1 — Invoice model + migration

### `src/models/invoice.js`
```js
// Invoice: a first-class patient-billing record (client-responsibility amount). Not insurance claims.
import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    practiceId:  { type: mongoose.Schema.Types.ObjectId, ref: "Practice", required: true, index: true },
    clientId:    { type: mongoose.Schema.Types.ObjectId, ref: "Client",   required: true, index: true },
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who created/owns the charge
    invoiceNumber: { type: String, required: true },
    date:        { type: Date, default: Date.now },
    amount:      { type: Number, required: true },
    status:      { type: String, enum: ["pending", "paid", "overdue"], default: "pending", index: true },
    paymentMethod: { type: String, enum: ["cash", "check", "credit", "insurance", "other"] },
    paymentDate: { type: Date },
    notes:       { type: String },
    document:    { type: String },   // generated invoice doc URL
    documentKey: { type: String },   // storage key
    paymentLink: { type: String },   // Stripe payment link
    lastReminderSent: { type: Date },
    // optional line items (sessions billed) — keep simple: list of {sessionId, description, amount}
    lineItems:   [{ sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" }, description: String, amount: Number }],
  },
  { timestamps: true }
);

invoiceSchema.index({ practiceId: 1, status: 1, date: -1 });
invoiceSchema.index({ clientId: 1, date: -1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
```

### Migration `scripts/migrate-invoices.mjs` (run once, idempotent)
For each client with `billing.invoices[]`: create an `Invoice` doc per embedded entry, carrying
`practiceId` (from the client), `clientId`, `counselorId` (client's assigned), and all fields. Skip if
an Invoice with that `invoiceNumber` + `clientId` already exists. After verifying, the embedded array
can be dropped from the client schema (Part 4). Keep the script; print a count.

### Rewrite the invoice routes on the model + `clientScope`
All under `src/app/api/clients/[id]/invoices/`. Pattern: verify the client is in the caller's scope
(`clientScope(user)` — the Round 10 helper), then operate on `Invoice` docs scoped to that client +
the practice. Specifically:

- **`generate/route.js`** — create an `Invoice` (not push to array). Scope-check the client first.
  Generate `invoiceNumber` (e.g. `INV-{YYYYMM}-{seq}` or a short random). **Audit** the create.
- **`[invoiceId]/route.js`** (GET/PATCH/DELETE) — fetch the Invoice by id, verify its `clientId` is in
  the caller's scope. PATCH (edit) and DELETE **audited**.
- **`[invoiceId]/status/route.js`** — **replace the legacy `userId: user._id` filter** with: load the
  invoice, confirm client in `clientScope`, set status/paymentDate/paymentMethod. **Audit** the status
  change (pending→paid is a meaningful financial event).
- **`[invoiceId]/verify-payment/route.js`** — **stop fan-out fetching `/status`**; check the Stripe
  payment + update the Invoice directly via the helper. Scope-checked. Audited.
- **`[invoiceId]/reminder/route.js`** — already uses Resend; route through `lib/email.js` (R11). Scope
  check; record `lastReminderSent`. (Reminder send can be audited too — optional.)
- **`clients/[id]/billing/route.js`** — returns the client's billing reference info + their invoices;
  query `Invoice.find({ clientId, ...practice scope })` instead of reading the embedded array.
- **`stripe/create-payment-link/route.js`** — scope-check (it currently has practiceId in metadata
  only); attach the resulting `paymentLink` to the Invoice doc.

> Net: every invoice route is `clientScope`-guarded (so Clinician A can't touch Sarah's invoices when
> Sarah isn't theirs — the e2e Phase 7 hole), and financial mutations are audited (they weren't).

## Part 2 — Reconcile consent to ONE system

Keep the **standalone `ConsentForm` model** (`src/models/consentForm.js`) and its `/api/consent-forms`
routes — it's the richer, correct one. Retire the embedded `client.consentForms[]`.

- **UI fix** (`ClientDetail.js`): today it **creates** via `/api/consent-forms` but **deletes** via
  `/api/clients/[id]/consent-forms/[formId]` (embedded). Repoint delete (and any view/list) to the
  standalone `ConsentForm` routes so one model is the source of truth. List the client's forms via
  `ConsentForm.find({ clientId, ...scope })`.
- Add **practice/assignment scoping** to the `ConsentForm` routes (they should honor `clientScope`
  like everything else — a clinician sees consent only for their clients). Add `practiceId` to the
  model (mirror the others) and set it on create; backfill via a tiny script or inline with the
  invoice migration.
- **Delete** the embedded consent routes `src/app/api/clients/[id]/consent-forms/**` and the
  `client.consentForms[]` field (Part 4). Migrate any existing embedded forms into `ConsentForm` docs
  in the migration script (likely none in synthetic data, but handle it).
- Consent emails route through `lib/email.js`.

## Part 3 — Billing IA / naming (kill the "two billings" confusion)

- The client chart tab currently "Billing & Consent" → keep as the **client** billing surface, but
  label it clearly as patient-facing: e.g. **"Billing & Consent"** stays, but inside, the heading is
  "Client Billing" and it's unmistakably about *this client's* invoices/consent — never the practice
  subscription.
- The **practice subscription** lives at `/billing` (account-level, R7). Make sure nothing in the
  client chart links to or mentions the subscription, and vice-versa. If the Navbar/account menu
  calls the subscription page "Billing," rename it **"Subscription"** to disambiguate.
- Quick win (your earlier ask): on the client header, show **"Assigned to: {clinician name}"** (owner
  sees it on every client; clinician on their own). Small, and it makes the assignment model visible.

## Part 4 — Drop the embedded fields (after migration verified)

From `src/models/client.js`: remove `billing.invoices[]` (now the Invoice model) and
`consentForms[]` (now ConsentForm). **Keep** `billing.paymentMethod/rate/initialRate/groupRate/notes`
and the `insurance` block — those are reference info the clinician reads, still used.
Grep after: `grep -rn "billing.invoices\|consentForms" src --include=*.js --include=*.jsx | grep -v models/` → nothing (all via models now).

## Acceptance criteria

1. Invoices are `Invoice` docs; generating/editing/paying/deleting works through the chart and is
   **scope-guarded** — Clinician A (not assigned Sarah) gets 404 on Sarah's invoice endpoints
   (the Phase-7 hole closed). Owner can manage any.
2. Financial mutations (create, status→paid, delete) write **audit** entries; visible in the admin
   AuditLogs viewer.
3. Cross-client query works (proof the model earns itself): a quick check that
   `Invoice.find({ practiceId, status: "pending" })` returns across clients (even just logged/tested,
   no UI required this round).
4. **One** consent system: create/list/view/delete all go through `ConsentForm`; embedded consent
   routes + `client.consentForms[]` gone; consent scoped by `clientScope`.
5. Client header shows "Assigned to: {clinician}". Subscription page labeled "Subscription," not
   "Billing." No path conflates client billing with practice subscription.
6. Migration script run; the test client's invoices/consent migrated. Embedded fields removed.
   `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
feat(cognicare): Invoice model + migrate embedded client invoices
refactor(cognicare): invoice routes on Invoice model + clientScope + audit (fixes status/verify-payment scope)
refactor(cognicare): reconcile consent to single ConsentForm model; scope it; drop embedded
feat(cognicare): client header "Assigned to"; rename subscription nav to "Subscription"
refactor(cognicare): drop embedded client.billing.invoices + consentForms after migration
chore(cognicare): one-off invoice/consent migration script
```

## After this

Dead-code audit (systematic sweep — produce a report, then delete with evidence), then the
cosmetic/landing/theme/animation revamp, then PHI/compliance last (BAA + field-level encryption on
the real PHI: initialAssessment, session.notes, aiReport.payload, liamThread.turns).
