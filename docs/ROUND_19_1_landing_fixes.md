# Round 19.1 — Landing page visual fixes

> Branch `dev`, working dir `products/cognicare`. Pure landing-page (`src/app/page.js`) polish from
> live-eyeball feedback. The Option-C token migration over-mapped many surfaces to `bg-accent` +
> `text-primary`, producing low-contrast "blue text on blue" and one miscolored card. Fixes below.

## 1. Fix the blue-on-blue agent cards (contrast)

Lines 109–147: cards are `bg-accent` (light blue) with `text-primary` (blue) headings — blue text on
blue background, low contrast. If section 101 is **kept** (per the caveat above) fix it; if deleted,
this is moot. The pattern fix wherever it occurs (also applies to other `bg-accent` card groups —
Key Benefits L165+, etc.):

- Card background `bg-accent` → **`bg-white border border-border`** (clean card on the section bg),
  OR keep `bg-accent` but change heading text to **`text-foreground`** (near-black) instead of
  `text-primary`. Pick one and apply consistently. **Recommend: white cards with `border-border`**,
  headings `text-foreground`, body `text-muted-foreground` — maximum legibility, matches the calm
  aesthetic.
- Card **icons/numbers** can stay `text-primary` (small accent of blue is good; it's the large
  text-on-fill that's the problem).

## 2. "Ready to Transform" → footer: tame the multiple blues

The bottom zone stacks several blue surfaces:

- **CTA section (533):** `bg-primary text-white` — a solid deep-blue band. **Keep this** — one strong
  blue CTA band is good; it's the _anchor_.
- **Footer (554):** `bg-accent` (light blue) — sitting right under the blue CTA makes "two blues
  stacked." Change the footer to a **neutral** surface: `bg-muted` (warm light gray) or
  `bg-background` with a `border-t border-border`. A neutral footer under the blue CTA reads far
  cleaner and is the conventional pattern.
- Net: deep-blue CTA band → neutral footer. One intentional blue, not a gradient of blues.

## 3. Footer "All rights reserved" — lower & cleaner

Line 595: the copyright currently sits in the footer body. Make it a distinct **bottom bar**:

- Separate the `© {year} CogniCare. All rights reserved.` onto its own row at the very bottom,
  with a `border-t border-border` above it, smaller muted text (`text-sm text-muted-foreground`),
  centered or left-aligned, with a bit of top padding. So the footer reads: [link columns] →
  thin divider → [copyright bar]. Cleaner, more conventional, "lower."

## 4. While here — consistency sweep

- Any remaining large `text-primary` headings sitting on `bg-accent`/`bg-primary` fills → ensure
  contrast (white text on `bg-primary`, dark text on light fills). Scan the page top-to-bottom once.
- Confirm the hero, features (286, white cards w/ shadow — those are fine), pricing, and CTA all read
  as **one** blue (primary) used intentionally, with neutrals (white/`bg-muted`) for the rest — not
  five different blue tints competing.

## Acceptance criteria

1. Only **one** "How CogniCare Works"-type section (the arrows/steps one); no duplicate; nav anchors
   valid.
2. No blue-text-on-blue-background cards; agent/benefit cards are legible (white cards or dark text
   on light fill, consistently).
3. The Documentation card matches its siblings (no lone dark card).
4. Bottom of page: one deep-blue CTA band, then a **neutral** footer (not blue-on-blue), with the
   copyright as a clean bottom bar separated by a divider.
5. The landing reads as one intentional blue + neutrals, not multiple competing blue shades.
6. `npm run lint` clean; `npm run build` succeeds.

## Suggested commit

```
fix(cognicare): landing polish — dedupe How It Works, fix blue-on-blue cards, neutral footer, clean copyright bar
```

## Note

This is the kind of visual nit only catchable live — there may be a few more once you see this pass.
Send any remaining ones (spacing, a stray tint, mobile layout) and I'll batch them. After the landing
reads clean, the only remaining planned work is the PHI/compliance track (last, pre-real-client).
