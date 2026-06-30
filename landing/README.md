# Handoff: CogniCare Marketing Landing Page

## Overview
A full redesign of the public marketing/landing page for **CogniCare** — the AI-powered clinical
practice-management product for mental-health therapists. The page sells the core value prop ("More
care. Less paperwork."), explains the five-agent AI pipeline + LIAM copilot, the surrounding practice
tooling, pricing, and the honest pre-launch HIPAA-hardening status.

This replaces the current `src/app/page.js` landing page.

## About the Design Files
The files in this bundle are **design references authored in HTML** (a single self-contained Design
Component prototype). They show the intended **look, copy, and behavior** — they are **not production
code to paste in**. Your task is to **recreate this design inside the existing CogniCare codebase**
using its established stack and conventions:

- **Next.js 15 (App Router) · React 18**
- **Tailwind CSS v4 · shadcn/ui**
- Existing design tokens already defined in `src/app/globals.css` (the "Sky" palette) — **reuse them**,
  do not hardcode new hex values where a token exists.

The prototype was built with inline styles for fast iteration; in the real app, express everything
with **Tailwind utility classes + the existing CSS variables / shadcn components**.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, copy, and interactions. Recreate the UI
faithfully using Tailwind + the repo's tokens. The exact hex values below all map to tokens that
already live in `globals.css` — prefer the token.

## Design Tokens
All of these already exist in `src/app/globals.css` as the "Sky" palette. Map design → token:

| Role | Hex | Existing token |
|---|---|---|
| Navy text / dark surfaces | `#0B2B6B` | `--foreground` / `--chart-5` |
| Primary action (bright blue) | `#2F80FF` | `--primary` / `--chart-3` / `--ring` |
| Teal accent | `#158A98` | `--accent` / `--chart-2` |
| Cyan accent | `#25B9C8` (light `#54C8D6`) | `--chart-4` |
| Green / progress | `#4DBB6A` | `--chart-1` |
| Soft sky surface | `#F2F7FD` | `--secondary` |
| Near-white root | `#FCFEFF` | `--background` |
| Hero deep navy gradient | `#16407f → #0B2B6B → #081f54` | — (gradient, derive from navy) |
| Card border | `#E3ECF7` | close to `--border` |
| Muted body text | `#41557A` / `#54678A` | `--muted-foreground` family |

**Typography** (add via `next/font/google` in `layout.js` if not present):
- Headings: **Bricolage Grotesque**, weights 400–800, `letter-spacing: -0.02 to -0.03em`, `line-height ~1.05`.
- Body / UI: **Hanken Grotesk**, weights 400–800.
- Type scale used: hero H1 62px/800-ish (700), section H2 44px, sub-section H3 24–28px, lead paragraph
  18–19px, body 14–16px, eyebrow label 13px uppercase `letter-spacing .12em`.

**Radii:** cards 18–24px, pills/buttons 999px, inner chips 11–14px.
**Shadows:** soft elevated cards `0 18px 40px -28px rgba(11,43,107,.25)`; floating hero cards
`0 40px 80px -30px rgba(4,16,46,.55)`; primary CTA glow `0 16px 40px -14px rgba(47,128,255,.75)`.

## Screens / Views
Single long-scroll page. Sections top → bottom:

### 1. Announcement bar (optional/toggleable)
- Full-width, bg `#081f54`, text `#BBD3F7`, 13.5px center. Copy: pre-launch + 14-day trial note.
- In React, gate behind a prop/flag (`showAnnouncement`, default true).

### 2. Sticky nav
- Sticky top, translucent white (`rgba(252,254,255,.82)` + `backdrop-blur`), bottom border `#E3ECF7`.
- Left: logo mark (navy rounded square 38px with a cyan "C" arc SVG) + wordmark "Cogni" (navy) "Care" (teal), Bricolage 22px.
- Center links: How it works · LIAM · Practice · Pricing (color `#41557A`, hover `#2F80FF`).
- Right: "Log in" text link + "Start free trial" pill button (bg `--primary`, white, 999px radius).

### 3. Hero
- Two-column grid (`1.05fr / .95fr`), deep navy radial-gradient bg with a subtle dotted texture
  (radial-dot pattern, masked to fade out) and two blurred color blobs (cyan top-right, blue bottom-left).
- Left column:
  - Eyebrow pill "Your AI clinical team" with a pulsing green dot.
  - **H1: "More care." / "Less paperwork."** — second line in cyan `#54C8D6`. Bricolage 62px, line-height 1.02, `-0.03em`.
  - Lead paragraph (color `#B7CBE8`, 19px) describing the five agents + LIAM.
  - CTA row: primary "Start 14-day free trial" pill (with arrow icon) + ghost "See how it works" pill (transparent, white border).
  - Two trust chips with check/shield icons.
- Right column: three **floating mock cards** (CSS `float` keyframe animation, staggered):
  1. Client card "Maya R. · Session 7" with an ACTIVE badge and a PHQ-9 down-trend sparkline (green).
  2. LIAM message card (white) with a sample grounded answer + "Grounded in Maya's record" status.
  3. Navy "Documentation agent" card — "SOAP note drafted", progress bars, "Awaiting your review →".

### 4. Trust strip
- White band, centered inline list: PHQ-9/GAD-7 · DSM-5-TR/ICD-10 · SOAP notes · Stripe billing ·
  E-signature consent · Audit trail. Muted color, dot separators.

### 5. The AI pipeline (centerpiece) — `#pipeline`
- Centered header: eyebrow "The AI clinical team", H2 "Five specialists, running as one pipeline", lead paragraph.
- 5-column grid of agent cards over a horizontal dashed connector line (animated marching dash via SVG `stroke-dashoffset`).
- Each card: colored icon tile, big ghosted number (top-right), title, description. Cards have a
  staggered "glow pulse" border animation (box-shadow cycles to the agent's accent color). On hover: lift + shadow.
  - **1 Assessment** — green `#4DBB6A`, tint `#E7F6EC` — "Structured intake & risk evaluation from your observations."
  - **2 Diagnostic** — teal `#158A98`, tint `#E2F4F2` — "DSM-5-TR / ICD-10 differential, with the criteria laid out."
  - **3 Treatment** — blue `#2F80FF`, tint `#EAF3FF` — "Evidence-based plan with measurable, trackable goals."
  - **4 Progress** — cyan `#25B9C8`, tint `#E4F7FA` — "Measurement-based evaluation against the plan over time."
  - **5 Documentation** — navy `#0B2B6B`, tint `#E8EDF7` — "Drafts SOAP notes you review, edit and approve."
- Below: a "+1 Report agent" pill — "synthesizes the pipeline into a date-ranged narrative clinical report — exported as PDF."
- Note: prototype uses emoji as agent icons (🩺 🧩 🎯 📈 📝). **Swap for the repo's icon set (lucide/shadcn) in production.**

### 6. LIAM — `#liam`
- Two-column on navy gradient bg (`#0B2B6B → #081f54`) + dotted texture.
- Left: eyebrow "IN-SESSION COPILOT", H2 "Meet LIAM", subtitle "Listening Intelligent Assistant for
  Mental health", paragraph, and a 3-item bullet list (memory / cites the record / decision support only).
- Right: a glassy chat mock card — header with LIAM mark + "Re: Maya R. · Session 7" + "memory on" dot;
  a user bubble (blue, right) and a LIAM answer bubble (translucent, left) citing a GAD-7 drop 14→9;
  an animated typing-dots row.

### 7. Feature grid
- White section, eyebrow "Runs the whole practice", H2 "Everything around the work, handled".
- 3-column grid of 6 cards (icon tile + title + description), hover-lift:
  Self-driving workflows · Scheduling · Billing & consent · Narrative reports · Audit trail · Multi-tenant by design.
  (Exact copy in the HTML file.)

### 8. Measurement / Practice split
- Soft-sky bg, two cards:
  - Left (white): "Measurement-based care — See the trend, not just the session" + a GAD-7 8-week
    down-trend line chart (intake 14 → now 9) with "Reliable improvement" label.
  - Right (navy gradient): "Practice & team — Solo or group, confidentiality built in" + two role rows
    (Dr. Reyes · Owner = full access; J. Lin · Clinician = own caseload only).

### 9. Pricing — `#pricing`
- Centered header + a **Monthly / Annual segmented toggle** (annual = −20%).
- Two plan cards (max-width ~840px):
  - **Solo** (white): **$69/mo** monthly, **$55/mo** annual. Note line reflects billing cycle. Soft-blue
    "Start free trial" button. 5 feature checks.
  - **Practice** (navy gradient, "PER SEAT" badge): **$59/seat/mo** monthly, **$47/seat/mo** annual.
    Primary-blue CTA. 5 feature checks.
- Behavior: toggling Monthly/Annual swaps both prices, the note text, and the active toggle styling.
  State: one boolean `annual`.
- **Verify these prices against the live Stripe price IDs** (`NEXT_PUBLIC_STRIPE_PRICE_SOLO` /
  `NEXT_PUBLIC_STRIPE_PRICE_PRACTICE`) before shipping — the trial is 14 days.

### 10. Security / compliance band
- Soft-sky rounded card, shield icon, "Designed HIPAA-aligned, built on a foundation of trust" +
  honest copy: audit logging, access control, session timeouts, TLS are live; OpenAI BAA + field-level
  PHI encryption in hardening; synthetic data only for now. Right column: 3 check items.
- **Keep this honest** — it mirrors the README's pre-launch compliance status. Do not overstate HIPAA readiness.

### 11. Final CTA
- Navy radial-gradient + dotted texture, centered. H2 "Give your practice an AI clinical team",
  paragraph, primary "Start 14-day free trial" pill + ghost "Book a walkthrough" pill.

### 12. Footer
- Deep navy (`#081f54`). 4 columns: brand blurb + Product / Workflow / Company link groups.
  Bottom row: "© Anansi Technology LLC. All rights reserved." + the clinical-decision-support disclaimer.

## Interactions & Behavior
- **Nav:** sticky, translucent + blur. Anchor links scroll to section ids (`#pipeline`, `#liam`, `#practice`, `#pricing`).
- **Pricing toggle:** single `annual` boolean; swaps prices, note text, and segmented-control active styles. Transition .18s.
- **Hover states:** CTA pills lift `translateY(-2px)` + stronger shadow; cards lift `translateY(-4/-5px)` + shadow + border tint; ghost buttons lighten bg/border; nav + footer links shift toward primary/navy.
- **Ambient animations (decorative, CSS keyframes):**
  - `float` / `float2` on hero mock cards (6–7s ease-in-out infinite, staggered).
  - `ccGlow` border-pulse on the 5 pipeline cards, staggered `animation-delay` 0 / 1.1 / 2.2 / 3.3 / 4.4s — produces a wave traveling down the pipeline.
  - `ccDash` marching dashed connector under the pipeline (SVG `stroke-dashoffset`).
  - `ccBlink` on "live"/memory/typing dots.
  - Respect `prefers-reduced-motion` in production — gate these animations.
- **Responsive:** prototype is desktop-first (≥1200px). For production, collapse: hero → single column
  (visual below copy), pipeline 5-col → 2-col/1-col, feature grid 3-col → 1-col, splits stack, nav links
  → hamburger/sheet on mobile.

## State Management
- `annual: boolean` — pricing cycle toggle (local component state).
- `showAnnouncement: boolean` — optional flag/prop for the announcement bar.
- No data fetching; the page is static marketing content. CTAs link to signup / Stripe checkout / login routes.

## Assets
- **Logo mark** — simple navy rounded-square with a cyan "C" arc (inline SVG in the prototype). Repo
  already ships brand assets in `public/` (`cognicare_lockup.svg`, `logo-icon.svg`, `logo-nav-white.svg`) —
  **use those** instead of the inline placeholder. Copies included in this bundle for reference.
- **Icons** — prototype uses emoji placeholders for agent/feature tiles. Replace with the repo's icon
  library (lucide-react via shadcn).
- **Charts** — hand-drawn inline SVG polylines (PHQ-9 / GAD-7 trends). Re-implement with the same data
  or the repo's chart component.
- **No raster images required** (the floating hero cards are pure HTML/CSS mocks of real app UI).

## Files
- `CogniCare Landing.dc.html` — the full design prototype (this is the reference to recreate). Open in a
  browser to see live behavior/animations. It targets `src/app/page.js` in the codebase.
- `cognicare_lockup.svg`, `logo-icon.svg`, `logo-nav-white.svg` — brand assets from the repo `public/` dir.
