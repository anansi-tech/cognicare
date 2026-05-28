# Round 23 — Landing consolidation

> Branch `dev`, working dir `products/cognicare`. Three changes to `src/app/page.js`:
> (1) lock the agent framing to **"Your AI clinical team"**, (2) merge two redundant middle
> sections into one lean value section, (3) delete the "Ready to transform" CTA. Net: ~300 lines
> removed, page tightens to 5 sections, nothing substantive lost.

## 1. Hero (47–76) — fix framing + benefit-led copy

The hero subhead currently says "6 AI Agents. One Powerful Team." and the body restates the count.
Replace both:

```jsx
<h2 className="text-2xl text-foreground/80 mb-8 font-medium">
  Your AI clinical team
</h2>
<p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
  Specialized agents handle assessment, diagnosis, treatment planning, progress tracking, and
  documentation — so you focus on the therapy, not the paperwork.
</p>
```
- Lock the **"Your AI clinical team"** phrase everywhere on the landing (and only here on the
  landing — billing already uses "your AI clinical team," so we're aligned).
- Body is benefit-led: names what the agents do (echoes the diagram below) and the payoff (focus
  on therapy, not paperwork). No number that has to be kept in sync.

## 2. Delete two sections; replace with ONE lean value section

**Delete entirely:**
- "Why therapists love it" (93–169) — three cards repeating documentation/progress/etc. that the
  hero image already shows.
- "Everything you need in one place" (171–393, ~220 lines) — eight cards literally restating each
  agent. (Confirmed: AI Session Notes, Treatment Planning, Progress Analytics, Reporting, Risk
  Assessment, Session Prep, Diagnostic Insights, Secure by design — all in the diagram already.)

**Replace with ONE new section between hero image and pricing** — the things the diagram does
*not* show. Title shifts the angle from "what the AI does" to "what the platform does for the
practice." Suggested:

```jsx
{/* What you also get — practice features beyond the agent pipeline */}
<section className="py-16 px-4 bg-white">
  <div className="max-w-5xl mx-auto">
    <h2 className="text-3xl font-bold text-center text-foreground mb-12">
      Built for how your practice actually runs
    </h2>
    <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
      <ValueItem title="LIAM, your in-session copilot">
        Ask anything mid-session — LIAM answers from this client's full record, not a generic chatbot.
      </ValueItem>
      <ValueItem title="Solo or group practice">
        Invite colleagues, share a roster with assignment-based confidentiality, manage seats from one
        place.
      </ValueItem>
      <ValueItem title="Scheduling that runs itself">
        Recurring appointments, automatic client reminders, no-show tracking — without leaving the chart.
      </ValueItem>
      <ValueItem title="Billing and consent in one place">
        E-signature consent forms, invoices, and Stripe payment links — built into the client record.
      </ValueItem>
    </div>
  </div>
</section>
```
Define `ValueItem` inline (small, no SVG icon soup — title + body, that's it):
```jsx
function ValueItem({ title, children }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
```
- **No icon-in-a-circle pattern.** Big titles + clean paragraphs. Reads like a list of capabilities,
  not a card sales deck. (The hero image already carries the visual weight.)
- Four items, two-column desktop, single-column mobile. Don't pad to six.

## 3. Delete the "Ready to transform" CTA section (419–436)

Pricing's own plan-card CTAs ("Start 14-day free trial") are the conversion point — a second
generic CTA above the footer adds nothing. Cut the entire `{/* CTA Section */}` block.

## 4. Sweep: any other "6 agents"/"six agents" copy

After locking to "Your AI clinical team", grep the landing for leftover counts:
- `grep -n "6 AI\|6 agent\|six agent\|six AI\|6 specialized" src/app/page.js` → fix any to the new
  phrasing (or "specialized agents" without a count). The hero diagram itself says "Five
  specialists, one workflow" — that's the image's wording, fine as-is (it's accurate).

## Acceptance

1. Hero subhead = "Your AI clinical team"; body is benefit-led; no number on the page conflicts with
   the hero diagram.
2. The two redundant card-soup sections are gone; one ~4-item value section (LIAM / team /
   scheduling / billing & consent) sits between the hero image and pricing.
3. The "Ready to transform" CTA section is deleted.
4. Page reads as: nav → hero → image → "Built for how your practice actually runs" → pricing →
   footer. Five sections, nothing repeating.
5. `grep -n "6 agent\|six agent\|6 AI\|six AI" src/app/page.js` → nothing.
6. `npm run lint` clean; `npm run build` succeeds.

## Commit
```
refactor(cognicare): landing — lock "Your AI clinical team" framing; merge redundant sections; drop generic CTA
```
