# Round 19 — Visible revamp: landing pricing, footer, honest agent visual

> Branch `dev`, working dir `products/cognicare`. The visible half of the revamp, on the Option C
> token foundation from Round 18. Three things: (1) fix the **badly stale landing pricing** (it
> advertises a $99/25-client plan that no longer exists), (2) **kill the dead footer links**, (3)
> replace the **meaningless animated agent SVG** with an honest 6-agent pipeline visual. Pure
> presentation — no backend changes.

## Why (verified)

- `src/config/plans.js` drives the landing pricing and shows **"$99/month, Single Therapist, 25
  client limit"** + a fictional "3-client trial." Reality (Round 7/7.2): **Solo $69/mo, Practice
  $59/mo per clinician, 14-day trial, no client limit** (the limit gate was deleted). The landing is
  advertising a product that doesn't exist — a credibility problem for a prospect.
- Footer links **blog, docs, support, careers, demo** all 404 (verified — no pages). Only `about`
  and `contact` exist.
- The landing hero has an animated SVG (circle + `flow-line` `<animate>`) listing six agents incl.
  "Conversational Agent" (old LIAM name) — decorative motion with no real meaning.

## Part 1 — Fix the pricing (config + landing)

### `src/config/plans.js` — make it match reality
Replace the stale `plans` with the real offering. Keep the `features` map but correct it (no client
limit). Suggested:
```js
export const plans = {
  solo: {
    id: "solo",
    name: "Solo",
    price: 69,
    duration: "month",
    priceEnvVar: "NEXT_PUBLIC_STRIPE_PRICE_SOLO",
    features: [
      { ...features.aiAgents, included: true },     // 6 AI agents + LIAM
      { ...features.fullAccess, included: true },    // unlimited clients & sessions
      { ...features.sessionNotes, included: true },
      { ...features.progressAnalytics, included: true },
      { ...features.emailSupport, included: true },
    ],
    cta: "Start 14-day free trial",
    description: "For independent therapists.",
    popular: true,
  },
  practice: {
    id: "practice",
    name: "Practice",
    price: 59,
    duration: "month / clinician",
    priceEnvVar: "NEXT_PUBLIC_STRIPE_PRICE_PRACTICE",
    features: [
      { ...features.aiAgents, included: true },
      { ...features.fullAccess, included: true },
      { ...features.sessionNotes, included: true },
      { ...features.progressAnalytics, included: true },
      { ...features.emailSupport, included: true },
    ],
    cta: "Start 14-day free trial",
    description: "For group practices. Billed per clinician.",
  },
};
```
- **Remove** `clientLimit` from the `features` map and any "25 clients / 3 clients" language — there
  is no client limit. Replace with "Unlimited clients & sessions" (`fullAccess`).
- **`hipaaCompliance` feature — remove or soften.** The PHI/BAA work is the *last* round and not done
  yet; advertising "Fully HIPAA compliant" on the landing now is inaccurate and risky. Change to
  something honest like "Secure, encryption-ready" or drop it until the PHI round lands. **Do not
  claim HIPAA compliance until it's true.**

### `PricingPlans.js` — render the two real plans
It reads `plans.trial`/`plans.paid` today. Update to render `plans.solo` + `plans.practice`
(two cards, Solo marked popular, 14-day-trial note). The landing's pricing section heading "Choose
the plan that works best for you" is fine. Make the CTA go to signup/billing as it does now.

> The in-app `/billing` page already has correct $69/$59 copy from Round 7.1 — this just brings the
> **public landing** in line with it. Consider whether `/billing` and the landing can share the same
> plan data (`config/plans.js`) so they can never drift again — if low-effort, unify them; if not,
> at least make the numbers match.

## Part 2 — Kill dead footer links

`src/app/page.js` footer (~L910–985). Remove links to non-existent pages: **blog, docs, support,
careers, demo**. Keep **about** and **contact** (they exist). Result — a tighter footer:
- **Product**: Features (#features anchor), Pricing (#pricing anchor)
- **Company**: About, Contact
- Drop the "Resources" column entirely (blog/docs/support were all it had).
- Keep the CogniCare blurb column.

Don't invent new pages to fill columns — fewer, working links beats more, broken ones. A clean
2-column footer is fine.

## Part 3 — Honest 6-agent pipeline visual (replace the relic)

Replace the decorative animated SVG (the `flow-line`/`<animate>` circle thing, ~L100–175 of
`page.js`) with a clear, meaningful visual of how the agents actually work — a **pipeline**, since
that's the real architecture (each feeds the next), with LIAM alongside as the in-session copilot.

Design (keep it on-brand: Option C blue/teal tokens, flat, calm — no gratuitous motion):
```
Intake ─▶ Assessment ─▶ Diagnostic ─▶ Treatment ─▶ Progress ─▶ Documentation
                                                                      │
                                            LIAM ◀── in-session copilot┘ (consults the whole record)
```
- Render as a clean horizontal (desktop) / vertical (mobile) flow of 5 labeled nodes
  (Assessment → Diagnostic → Treatment → Progress → Documentation), with a short caption each
  ("structured intake & risk", "DSM-5 differential", "evidence-based plan", "measurement-based
  tracking", "SOAP notes you approve").
- **LIAM** shown as a distinct node (teal accent) connected to the pipeline, captioned "in-session
  copilot — answers from this client's history."
- Use the **real current names** — "LIAM", not "Conversational Agent." Five specialists + LIAM
  (report-synthesis is part of documentation/reporting, not a 6th headline node — keep the pitch
  clean, matching the billing copy).
- **Subtle** motion at most (a gentle directional flow indicator is fine); no spinning orbits. The
  point is to *explain the product*, not decorate. A mostly-static, well-labeled diagram beats the
  old meaningless animation.
- This can be a reusable component (`src/app/components/AgentPipeline.jsx`) used as the **landing
  hero** visual. (The dashboard doesn't need it — its "animation" was just a loading spinner, which
  is fine; leave that.)

> Build it with the frontend-design skill conventions (flat, token colors). It should look like it
> belongs to the new Option C palette.

## Part 4 — While we're on the landing: quick polish

- Apply the wider shell feel — the landing uses its own max-width; make sure it doesn't look cramped
  vs. the now-wider app (use a generous but readable content width, e.g. `max-w-screen-xl` for text
  sections, full-bleed for hero).
- Replace any remaining old agent naming ("Conversational Agent") with "LIAM" across the landing.
- The hero CTA "Start Free Trial" → "Start 14-day free trial" (consistent, concrete).

## Acceptance criteria

1. Landing pricing shows **Solo $69 / Practice $59 per clinician**, 14-day trial, **no** "25 client"
   or "3 client" limits; CTAs work. Numbers match `/billing`.
2. No "Fully HIPAA compliant" claim on the landing (softened or removed until the PHI round).
3. Footer has only working links (Product: Features/Pricing; Company: About/Contact). No
   blog/docs/support/careers/demo. `grep -n "blog\|/docs\|/support\|/careers\|/demo" src/app/page.js`
   → nothing.
4. The animated relic is gone; in its place a clean, on-brand (Option C) agent **pipeline** visual
   using real names (LIAM, not "Conversational Agent").
5. Landing uses the screen width well; old agent naming gone. `npm run lint` clean; `npm run build`
   succeeds.

## Suggested commits

```
fix(cognicare): correct landing pricing to real Solo $69 / Practice $59 (no client limit)
fix(cognicare): remove unverifiable HIPAA-compliance claim from landing
refactor(cognicare): prune dead footer links (blog/docs/support/careers/demo)
feat(cognicare): honest 6-agent pipeline hero visual (replaces decorative animation); LIAM naming
```

## After this — the finale
That completes the visual revamp. The only remaining planned work is the **PHI / compliance track**
(OpenAI BAA + field-level encryption on the real PHI: initialAssessment, session.notes,
aiReport.payload, liamThread.turns) — gated to before real-client use, a few months out. After that,
CogniCare is feature-complete, modern, and compliance-ready.
