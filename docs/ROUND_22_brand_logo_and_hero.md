# Round 22 — Two-color logo + palette consistency sweep

> Branch `dev`, working dir `products/cognicare`. The palette is already mapped to tokens (good).
> This round: (1) the two-color `Cogni`/`Care` logo treatment, (2) make sure the whole site reads in
> the new palette consistently. Plus a list of hero-image edits to ask ChatGPT for.

## 1. Two-color logo (Cogni navy + Care teal)

Make a tiny shared component so it's consistent everywhere and easy to swap later:

`src/components/Brand.jsx`:
```jsx
export function Brand({ className = "text-xl font-bold" }) {
  return (
    <span className={className}>
      <span style={{ color: "#0B2B6B" }}>Cogni</span>
      <span style={{ color: "#158A98" }}>Care</span>
    </span>
  );
}
```
> Inline hex (not tokens) for the brand wordmark — the brand colors don't shift with theme. The
> in-app Navbar sits on `bg-primary` (bright blue) where dark navy + teal still read fine; verify.

Apply it everywhere the wordmark appears (grep `>CogniCare<` and `>CogniCare</`):
- `src/app/components/Navbar.js` — the two `<Link href="/">CogniCare</Link>` (L47, L133): replace
  the text with `<Brand />`. Drop `text-primary` / `text-white` since `Brand` owns its colors.
- `src/app/page.js` — the landing nav logo (top of page) and the hero `<h1>CogniCare</h1>` (L47):
  in the hero, use `<Brand className="text-6xl font-bold" />`.
- `src/app/(auth)/login/page.js` and `signup/page.js` — any logo/heading wordmark → `<Brand />`.
- Footer mention of "CogniCare" copyright: keep as plain text (small, muted — using the wordmark
  there is overkill).

## 2. Palette consistency sweep (light)

The tokens are right (`#FCFEFF` background, navy foreground, bright-blue primary, teal accent, light
blue muted, soft panel secondary, green/cyan in charts). Quick eyeball pass to catch holdovers:

- `grep -rn "indigo-\|emerald-\|blue-600\|blue-500\|teal-[0-9]" src/app --include=*.js --include=*.jsx`
  — should be near-zero brand colors; only semantic status (low-risk green, completed-green, etc.).
- Confirm the **landing nav** still reads well after the logo change (white bg + navy+teal wordmark
  + navy nav links).
- The **in-app Navbar is `bg-primary` (bright blue)**: with a navy+teal logo on bright blue, the
  contrast is OK but the teal "Care" might wash a touch. If so, render Brand white-on-primary inside
  the in-app Navbar (a prop variant: `<Brand variant="onPrimary" />` swapping both halves to white)
  rather than fight contrast. Decide live.
- The **hero image** uses `#D9E7F5` as a backdrop tint — same as `--muted`. Confirm the section
  the hero sits in uses `bg-muted` or transparent so the image edges blend, not float on white with
  a hard boundary.

## 3. Acceptance
1. `CogniCare` renders everywhere as **Cogni** in `#0B2B6B` + **Care** in `#158A98`, via `<Brand />`.
2. No washed-out logo on the bright-blue in-app Navbar (use onPrimary variant if needed).
3. No leftover indigo/teal-N/blue-N brand colors; site reads as the navy/teal/bright-blue/cyan/green
   family from the hero.
4. `npm run lint` clean; `npm run build` succeeds.

## Commit
```
feat(cognicare): two-color CogniCare wordmark (Brand component) + palette consistency
```

---

## Hero image — edits to ask ChatGPT for

The composition is great. Things to ask for, in priority order:

1. **Fix "DSM-5"** — should read **"DSM-5-TR"** (current standard; this matches your diagnostic
   agent's actual reference). Just two characters but it's the one detail a clinician will spot.
2. **Remove or qualify "HIPAA-compliant"** at the bottom — that claim isn't true yet (PHI/BAA round
   is last, not done). Ask for it changed to **"Encryption-ready"** or **"Built for healthcare"** —
   honest, future-tense-safe, and you can swap to HIPAA-compliant after the PHI round lands.
3. **"Five specialists, one workflow"** — keep, but consider if "+ LIAM" should be part of that
   line. Today the subhead says five and LIAM sits below as a separate band. That's actually clean —
   leave it unless you want the headline to explicitly name LIAM too.
4. **Step 4 (Progress) green circle** — slightly clashes with the teal/blue family; ask for it to
   shift to the **cyan `#25B9C8`** (matches palette) or a softer green that blends. The green "good
   progress" semantics are nice; just nudge the hue.
5. **The chair-and-plant illustration** in the top-right — feels lifestyle-y/generic; could be
   simplified or dropped. Optional. The shield+cross adds clinical credibility; could keep just
   that.
6. **Logo text in image** — if the image renders "CogniCare" anywhere as one solid color, ask for
   it as two colors matching the wordmark (Cogni navy `#0B2B6B`, Care teal `#158A98`). I don't see
   it in this version but worth specifying for future regenerations.
7. **The dashed lines from steps to LIAM** — currently green-dashed; suggest **teal dashed** for
   consistency with LIAM's identity color. Small polish.
8. **Accessibility detail**: ask that text on light-blue backdrops keeps WCAG AA contrast — easy ask,
   prevents the "looks great, can't read it on a projector" problem.

The one that's truly non-negotiable is **#1 (DSM-5-TR)** and **#2 (HIPAA claim)** — those are
factual accuracy. The rest is taste.
