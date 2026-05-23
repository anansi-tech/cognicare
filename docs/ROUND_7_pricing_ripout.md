# Round 7 — Carryover fixes + Pricing Rip-Out (Stripe as source of truth)

> Branch `dev`, working dir `products/cognicare`. Two parts: (0) two small fixes that didn't land in
> Round 6, then (1+) the plan's §4 / Week 4 pricing rip-out. Stripe owns subscription state; we keep
> only a cached status on the User. **Verified: this webhook is 100% subscription — client invoicing
> lives on a separate path (`/api/stripe/create-payment-link` + `BillingInfo`) and must stay intact.**

---

## Part 0 — Carryover from Round 6 (do first, tiny)

### 0a. baseAgent — use the `system` option (clears the AI SDK warning)
`src/lib/ai/baseAgent.js`, in `runAgent`, replace the `generateObject` call's message block:
```js
const { object } = await generateObject({
  model: openai(model),
  schema,
  schemaName: `${agentType}_report`,
  system: `${system}\n\n${clientBlock}`,          // was two role:"system" messages
  messages: [{ role: "user", content: requestBlock }],
});
```

### 0b. useEnsureWorkflow — expose `retry`, add "Try again" buttons
`src/hooks/useEnsureWorkflow.js`: extract the fetch into a `run()` callback and return `retry`:
```js
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useEnsureWorkflow({ shouldRun, type, clientId, sessionId, onDone }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const fired = useRef(false);

  const run = useCallback(() => {
    fired.current = true;
    setGenerating(true);
    setError("");
    fetch("/api/ai/agent-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, clientId, sessionId }),
    })
      .then((r) => { if (!r.ok) throw new Error("Workflow failed"); return r.json(); })
      .then(() => onDone?.())
      .catch((e) => setError(e.message || "Workflow failed"))
      .finally(() => setGenerating(false));
  }, [type, clientId, sessionId, onDone]);

  useEffect(() => {
    if (!shouldRun || fired.current) return;
    run();
  }, [shouldRun, run]);

  return { generating, error, retry: () => run() };
}
```
Then in `AutoIntake.jsx`, `AutoSessionPrep.jsx`, `AutoPostSession.jsx`: pull `retry` from the hook
and render a `Button variant="outline" size="sm" onClick={retry}` next to the error text.

> (E.5 — wiring `ClientAnalytics` to real MBC data — is intentionally **not** here. It's a feature,
> not a cleanup; do it as its own task when you want the analytics view on real measure data.)

---

## Part 1 — What this round deletes vs keeps

**Verified current subscription surface (all to be removed):**
- `src/models/subscription.js` (34 LOC), `src/lib/subscription-service.js` (194 LOC)
- `/api/subscriptions/{create,cancel,status,auto-renew}/route.js`
- `src/middleware/checkClientLimit.js` (call already removed from clients route during testing)
- `src/app/subscription/page.js` (342 LOC) + its Navbar link (`Navbar.js:169`)
- `src/app/api/webhooks/stripe/route.js` (230 LOC, all-subscription) — replaced with a slim version

**Keep untouched (separate feature — client invoicing):**
- `src/app/api/stripe/create-payment-link/route.js`
- `src/app/components/clients/BillingInfo.js` and its model/storage
- Anything reading client invoices in the client "Billing & Consent" tab

> If any client-invoice flow happens to listen for `invoice.payment_succeeded` on a *client* payment
> (not a subscription), confirm before deleting that branch. From the current webhook, every branch
> is subscription-scoped (`invoice.subscription` guarded), so the replacement below is safe — but
> grep `create-payment-link` for whether it relies on a webhook at all (it appears to create
> standalone payment links, which Stripe handles without our webhook).

## Part 2 — User model: Stripe cache fields

`src/models/user.js`, add:
```js
stripeCustomerId:         { type: String },
stripeSubscriptionStatus: { type: String }, // webhook cache: trialing|active|past_due|canceled|unpaid|incomplete
```
These two fields ARE our local subscription state. Stripe is the truth.

## Part 3 — Billing helper (replaces subscription-service + checkClientLimit)

`src/lib/billing.js`:
```js
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ACTIVE = new Set(["trialing", "active", "past_due"]);

// Single source of access truth. Pass the user doc (must include stripeSubscriptionStatus).
export function hasActiveSubscription(user) {
  return ACTIVE.has(user?.stripeSubscriptionStatus);
}
```
> `past_due` stays allowed — Stripe is mid-retry on a failed charge; don't lock out a paying
> customer during dunning. `canceled`/`unpaid`/`incomplete` are not active.

## Part 4 — Endpoints: checkout + portal

`src/app/api/billing/checkout/route.js`:
```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { stripe } from "@/lib/billing";

export async function POST(req) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { priceId } = await req.json();

  await connectDB();
  const user = await User.findById(current.id);
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(user._id) } });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?checkout=cancel`,
    // 14-day trial is configured on the Stripe Price (trial_period_days), not here
  });
  return NextResponse.json({ url: session.url });
}
```

`src/app/api/billing/portal/route.js`:
```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { stripe } from "@/lib/billing";

export async function POST() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const user = await User.findById(current.id);
  if (!user?.stripeCustomerId) return NextResponse.json({ error: "No billing account" }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  });
  return NextResponse.json({ url: session.url });
}
```
The portal handles cancel / change plan / update card / toggle auto-renew — so the four custom
endpoints are no longer needed.

## Part 5 — Slim webhook (replace the whole file)

`src/app/api/webhooks/stripe/route.js` — only job: keep `User.stripeSubscriptionStatus` in sync. No
state machine, no billingHistory (the Stripe dashboard/portal is the billing record).
```js
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { stripe } from "@/lib/billing";

export async function POST(request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object;          // created | updated | deleted
    await connectDB();
    await User.updateOne(
      { stripeCustomerId: sub.customer },
      { $set: { stripeSubscriptionStatus: event.type === "customer.subscription.deleted" ? "canceled" : sub.status } }
    );
  }
  return NextResponse.json({ received: true });
}
```
> `sub.status` is Stripe's own enum (`trialing`/`active`/`past_due`/`canceled`/…) — we cache it
> verbatim, which is exactly what `hasActiveSubscription` checks. Configure the Stripe webhook
> endpoint to send `customer.subscription.created/updated/deleted`.

## Part 6 — Access gate + UI

- Anywhere the app gated on the old service (the clients route's removed `checkClientLimit`, and
  `subscription/page.js`'s status fetch), the gate is now `hasActiveSubscription(user)`. Apply it
  where a non-subscriber should be blocked from the core app — minimally, a check in the dashboard
  layout or a `requireSubscription()` helper used by the protected pages. (Decide the gate point;
  don't scatter it. One check in the authed shell is cleanest.)
- Replace `src/app/subscription/page.js` with a minimal `src/app/billing/page.js`:
  - If `!hasActiveSubscription`: show the two plans (Solo / Practice) with a "Subscribe" button →
    POST `/api/billing/checkout` → redirect to `session.url`.
  - If active: show current status (from `user.stripeSubscriptionStatus`) + a "Manage billing"
    button → POST `/api/billing/portal` → redirect to the portal.
  - Update the Navbar link `/subscription` → `/billing`.

## Part 7 — Stripe config (manual, document in the PR)

- Create two recurring Prices: **Solo** ($99/mo) with `trial_period_days: 14`, and **Practice**
  ($89/mo/seat). Put their price IDs in env (`STRIPE_PRICE_SOLO`, `STRIPE_PRICE_PRACTICE`).
- Enable the **Customer Portal** in the Stripe dashboard (allow cancel + plan switch + payment method).
- Point the webhook at `/api/webhooks/stripe` for `customer.subscription.created/updated/deleted`.
- Confirm `NEXT_PUBLIC_APP_URL` is set.

## Acceptance criteria

1. `grep -rn "subscription-service\|checkClientLimit\|models/subscription" src` → nothing.
   `/api/subscriptions/*` gone; `src/app/subscription` gone.
2. Client **invoicing** still works: `create-payment-link` and `BillingInfo` untouched and functional.
3. A user with no subscription is gated out of the core app and sees `/billing` with two plans;
   subscribing via Checkout returns and (after the webhook fires) `user.stripeSubscriptionStatus`
   becomes `trialing`/`active` and access is granted.
4. "Manage billing" opens the Stripe Customer Portal; cancelling there flips the cached status via
   the webhook and removes access.
5. Part 0: no AI-SDK system-message warning on an agent run; failed auto-workflows show a working
   "Try again".
6. `npm run lint` clean. Net LOC: ~600 deleted, ~120 added.

## Suggested commits

```
fix(cognicare): carryover — system option in runAgent + auto-workflow retry
feat(cognicare): User stripe cache fields + billing helper (hasActiveSubscription)
feat(cognicare): /api/billing checkout + portal endpoints
refactor(cognicare): slim Stripe webhook to subscription-status sync only
refactor(cognicare): delete Subscription model/service, custom endpoints, old subscription page
feat(cognicare): /billing page (plans + manage) ; gate core app on hasActiveSubscription
```

## Note — verify the invoicing/webhook boundary before deleting

Before replacing the webhook, confirm `create-payment-link` doesn't depend on a webhook branch for
client-invoice status. It appears to create standalone Stripe payment links (Stripe-hosted, no local
webhook needed), but a 30-second grep for how `BillingInfo` learns an invoice was paid will confirm
it. If it DOES rely on an `invoice.payment_succeeded` branch for non-subscription invoices, preserve
that one branch in the slim webhook (guard: only act when `invoice.subscription` is absent).
