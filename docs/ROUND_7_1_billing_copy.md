# Round 7.1 — Billing page copy (six-agent framing)

> Branch `dev`, working dir `products/cognicare`. Copy/UX only — no billing logic changes. The page
> works; it just undersells the product (the six agents are buried in one line) and the prices need
> updating to $69 / $59. Replace the `PLANS` array and the intro/empty-state copy in
> `src/app/billing/page.js`. Everything else (checkout, portal, status handling) stays as-is.

## Why

CogniCare's differentiator is that AI runs the **entire clinical workflow** — six agents — not just
notes. Competitors charge $35–40/mo *extra* for AI documentation alone; here it's one of six agents,
included. The page should lead with that, because it's what makes the price make sense to a therapist
reading cold.

## Replace the `PLANS` array

```js
const AGENTS = [
  "Assessment — structured intake & risk, automatically on every new client",
  "Diagnostic — DSM-5-TR / ICD-10 differential with the criteria met",
  "Treatment — evidence-based plan with measurable goals",
  "Progress — measurement-based tracking with reliable-change detection",
  "Documentation — SOAP notes drafted for your review and approval",
  "LIAM — in-session copilot that answers from this client's own history",
];

const PLANS = [
  {
    id: "solo",
    name: "Solo",
    price: "$69",
    cadence: "/mo",
    blurb: "For independent therapists. 14-day free trial, cancel anytime.",
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO,
    highlight: true,
    features: [
      "Your full AI clinical team — all six agents",
      "Unlimited clients & sessions",
      "PHQ-9 / GAD-7 administration with longitudinal trends",
      "Automatic workflow: intake, prep, and notes run themselves",
    ],
  },
  {
    id: "practice",
    name: "Practice",
    price: "$59",
    cadence: "/mo per clinician",
    blurb: "For multi-clinician practices. Everything in Solo, billed per seat.",
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRACTICE,
    highlight: false,
    features: [
      "Everything in Solo, for every clinician",
      "Per-seat pricing as your practice grows",
      "Shared client roster & admin role (coming soon)",
    ],
  },
];
```

## Add a headline above the plans (the six-agent pitch)

In the non-active branch, **above** the `grid` of plans, add an intro block that names the agents —
this is the part that sells. Use the `AGENTS` array:

```jsx
<div className="mb-8 rounded-lg border border-indigo-100 bg-indigo-50 p-6">
  <h2 className="text-lg font-semibold text-gray-900">
    Six AI agents handle the clinical heavy lifting
  </h2>
  <p className="mt-1 text-sm text-gray-600">
    You bring the observations. CogniCare's AI clinical team does the rest — built AI-native, not
    bolted on. Other platforms charge extra for AI notes alone; here it's one of six agents working
    together across the whole workflow.
  </p>
  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
    {AGENTS.map((a, i) => {
      const [name, desc] = a.split(" — ");
      return (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1 text-indigo-500">▸</span>
          <span><span className="font-medium text-gray-900">{name}</span> — <span className="text-gray-600">{desc}</span></span>
        </li>
      );
    })}
  </ul>
</div>
```

## Update the intro line (non-active state)

Tighten the existing empty-state paragraph to reinforce the pitch:

```jsx
<p className="mt-2 text-sm text-gray-600">
  Start a 14-day free trial — your full AI clinical team included. No charge until day 15; cancel anytime.
</p>
```

## Optional polish (small, do if quick)

- If `plan.highlight`, give the Solo card a slightly stronger border (e.g. `border-indigo-300
  ring-1 ring-indigo-100`) and a small "Most popular" pill, so the eye lands on the plan most
  trial users will pick.
- Keep the price as a real number now ($69/$59) — they match the Stripe Prices you created.

## Acceptance criteria

1. `/billing` (when not subscribed) leads with the six-agent block, then the two plan cards at
   $69 / $59 with the new feature lists.
2. Subscribe still routes through `/api/billing/checkout`; the active-state "Manage billing" portal
   button is unchanged.
3. `npm run lint` clean.

## Commit

```
feat(cognicare): billing page — six-agent value framing; $69/$59 pricing
```

---

## Deferred task (DO NOT build now) — Practice per-seat picker

The `Practice` plan is priced per clinician, but `/api/billing/checkout` hardcodes `quantity: 1`, so
today it would bill exactly one seat. **This is fine to ship** — validation is solo therapists (your
wife + colleagues), and there's no multi-clinician practice asking for it yet.

When a real practice needs it, the change is small:
- On the Practice card, add a seat-count input (number, min 1).
- Pass it to checkout: `body: JSON.stringify({ priceId, quantity: seats })`.
- In `checkout/route.js`, use it: `line_items: [{ price: priceId, quantity: quantity ?? 1 }]`.
- The Stripe Customer Portal already handles seat changes after the fact if "update quantity" is
  enabled, so post-purchase seat management may need no extra code.

Until then, leave `quantity: 1`. Don't build seat management for zero users — flag it in the PR as a
known follow-up so it's tracked, not forgotten.
