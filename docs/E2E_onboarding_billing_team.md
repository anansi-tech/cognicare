# E2E Test — Onboarding, Billing, Team & Invoicing

Walks the full multi-clinician flow on the current build, plus a **discovery section** for patient
invoicing (we expect to find scope issues there — those findings drive Round 12). Synthetic data only
(PHI gate still open). Test in Stripe **test mode** and Resend (real emails to addresses you control).

Cast (use emails you can actually receive):
- **Owner** — simulates the owner's wife (practice owner).
- **Clinician A**, **Clinician B** — her two colleagues.
- **Sarah Johnson** — the synthetic client from before.

---

## Phase 1 — Owner signup with a practice name

1. Sign up as Owner. **Set a practice name** (e.g. "Westside Counseling"). Use a real-to-you email.
2. **Expect:** lands logged in; gated to `/billing` (no subscription yet). On `/team` later, the
   practice shows as "Westside Counseling" — **not** "Owner's Practice."
3. **Check:** a second throwaway signup with the practice-name field **blank** → practice falls back
   to "{name}'s Practice". (Confirms the default still works.)

## Phase 2 — Subscribe (Practice, 3 seats, trial)

1. On `/billing`, the six-agent value block + two plans render at $69 / $59.
2. Pick **Practice**, set **Clinicians = 3**, confirm the live total reads `3 × $59 = $177/mo`.
3. Subscribe → Stripe Checkout (test card `4242 4242 4242 4242`, any future expiry/CVC) → returns to
   `/dashboard?checkout=success`.
4. **Expect:** after the webhook fires, the practice's `stripeSubscriptionStatus` = `trialing`, seats
   = 3, and the app is no longer gated. (If status doesn't update: confirm the webhook endpoint +
   `customer.subscription.*` events are configured, and `stripe listen` is forwarding in local dev.)
5. **Check:** the trial — Stripe shows a 14-day trial (the `subscription_data.trial_period_days` you
   added), no charge yet.

## Phase 3 — Invite the two clinicians (real email)

1. Go to `/team` (owner only — confirm a non-owner can't reach it).
2. Seat usage shows **1 of 3 used**.
3. Invite Clinician A by email → **an actual email arrives** (Resend) with a working link. Invite
   Clinician B likewise. Seat usage → **3 of 3 used** (1 active + 2 pending).
4. **Check seat cap:** try inviting a 4th → blocked with "All seats are in use. Add seats in Billing."
5. **Check resend/idempotency:** invite A again → reuses the pending invite (no duplicate), returns
   the same link.

## Phase 4 — Clinicians accept

1. Open Clinician A's invite link → "Join Westside Counseling" with email pre-filled → set name +
   password → submit.
2. **Expect:** A is now a clinician in the practice (not a new practice of their own). Log in as A.
3. **Expect:** A sees an **empty client list** — they have no assigned clients yet (assignment-based
   visibility). A does **not** see Sarah (she's unassigned or owner's).
4. Repeat for Clinician B.
5. **Check:** after both accept, `/team` (owner) lists 3 clinicians; seat usage 3 of 3, 0 pending.

## Phase 5 — Assignment & reassignment (the confidentiality core)

1. As **Owner**, create/confirm Sarah Johnson exists. Assign Sarah to **Clinician A** (or create her
   as A's). 
2. Log in as **A** → A sees Sarah. Log in as **B** → B does **NOT** see Sarah, and hitting Sarah's
   URL directly (`/clients/<sarahId>`) returns **not-found** (404, not a visible 403). *This is the
   confidentiality check — verify it at the URL level, not just the list.*
3. As **A**, reassign Sarah to **B** (A's own client → allowed). 
4. **Expect:** A loses access (Sarah disappears from A's list AND A can no longer open Sarah's
   sessions/reports — confidentiality follows the client). B now sees Sarah. An audit entry records
   the reassignment.
5. **Check authorization:** as **B**, try to reassign one of *A's* other clients (not B's) → **403**.
   As **Owner**, reassign any client → allowed.

## Phase 6 — Billing management

1. As Owner, `/billing` → "Manage billing" → Stripe Customer Portal opens.
2. **Check:** cancel in the portal → webhook flips status → app gates back to `/billing`. Re-subscribe
   to restore. (Confirms the portal + webhook round-trip.)
3. **Check (if quantity-update enabled):** change seats in the portal → reflected in the practice.

---

## Phase 7 — DISCOVERY: patient invoicing (expect issues → Round 12)

This is the part we're testing to *find* what's broken, since the invoicing routes may not have been
re-scoped during the practice re-root. Don't assume pass/fail — record what actually happens.

1. As **Clinician B** (Sarah is now B's client), open Sarah → **Billing** tab. Try to generate an
   invoice / payment link for a session.
   - **Record:** does it work? Does it scope to B correctly? Any error?
2. As **Clinician A** (does NOT have Sarah), attempt to hit Sarah's invoice endpoints directly:
   - `GET /api/clients/<sarahId>/billing`
   - `POST /api/clients/<sarahId>/invoices/generate`
   - **Critical record:** can A — who can't see Sarah — still touch her billing? If yes, that's the
     confidentiality bug Round 12 fixes (invoicing must honor the same visibility as clients).
3. As **Owner**, generate an invoice for any client → should work (owner sees all).
4. Check the invoice reminder email path (uses Resend) sends.
5. **Note for each:** worked / errored / wrong-scope. This list becomes Round 12's spec.

> Hypothesis going in: the invoicing routes (`clients/[id]/billing`, `invoices/generate`,
> `create-payment-link`, etc.) were NOT updated to the Round 8/10 practice+assignment scoping, so a
> clinician may reach clients outside their scope, or the queries may error on the changed ownership
> model. Phase 7 confirms which.

---

## Scorecard

- [ ] Signup sets practice name (and blank → default)
- [ ] Practice subscription: 3 seats, trial, status syncs via webhook
- [ ] Invites email for real; seat cap enforced at 3
- [ ] Invitees join the **same** practice; see only their own clients
- [ ] Direct-URL access to another clinician's client → 404 (confidentiality)
- [ ] Reassignment transfers access (old clinician loses sessions/reports too); auth rules hold
- [ ] Billing portal cancel/re-subscribe round-trips
- [ ] **Phase 7 findings recorded** (the invoicing scope reality)

## After this

Send me Phase 7's findings (and anything else that broke). I'll spec **Round 12 — invoicing scope
audit + fix** from the real behavior, not a guess. Then: dead-code audit, then the cosmetic/landing/
theme revamp, then PHI last.
