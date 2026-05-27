# Round 18 — Theme foundation: Mint Clinical palette + token migration + width

> Branch `dev`, working dir `products/cognicare`. **Foundation half** of the visual revamp — mostly
> invisible plumbing: wire the chosen palette ("Mint Clinical", Option A) into the design tokens,
> migrate the 37 files that hardcode `indigo`/`teal`/`blue` to use those tokens, and widen the app
> shell. After this the app looks recolored-but-structurally-identical and is **globally
> re-themeable from one place**. The visible work (landing page, dashboard pipeline visual) is the
> next round. Verify "nothing broke, green everywhere, consistent" before the fun stuff.

## Why this is foundation-first

There's already a shadcn `--primary`/`--accent`/etc. token system in `globals.css`, but **37 files
hardcode `indigo`/`teal`/`blue`** — so the theme is inconsistent AND can't be changed without editing
37 files. This round sets the tokens to the Mint Clinical palette and points everything at them, so
any future re-theme is a few lines. (Same discipline as the auth pure-swap: change the plumbing,
keep behavior.)

## Part 1 — Set the palette tokens (Mint Clinical)

`src/app/globals.css` `:root` — replace the grayscale `--primary`/`--accent`/etc. with Mint Clinical
oklch values. Primary = deep teal-green; accent = mint; warm-gray neutrals; destructive stays red
(safety alerts must alarm).

```css
:root {
  /* Mint Clinical palette */
  --primary: oklch(0.52 0.085 168);            /* deep teal-green */
  --primary-foreground: oklch(0.985 0.01 168);
  --secondary: oklch(0.96 0.015 168);          /* very light mint surface */
  --secondary-foreground: oklch(0.30 0.06 168);
  --accent: oklch(0.90 0.05 168);              /* mint accent */
  --accent-foreground: oklch(0.28 0.07 168);
  --muted: oklch(0.97 0.006 110);              /* warm-gray, faintly green */
  --muted-foreground: oklch(0.50 0.01 110);
  --ring: oklch(0.52 0.085 168);               /* focus ring = primary */
  --border: oklch(0.90 0.008 110);
  --input: oklch(0.90 0.008 110);
  --background: oklch(1 0 0);
  --foreground: oklch(0.20 0.015 168);         /* near-black, faint green tint */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.20 0.015 168);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.20 0.015 168);
  --destructive: oklch(0.577 0.245 27.325);    /* unchanged — red safety */
  /* chart ramp: greens + a contrasting coral/amber for multi-series */
  --chart-1: oklch(0.52 0.085 168);
  --chart-2: oklch(0.70 0.10 168);
  --chart-3: oklch(0.62 0.12 200);             /* teal-blue for a 2nd series */
  --chart-4: oklch(0.70 0.13 50);              /* warm contrast (amber) */
  --chart-5: oklch(0.55 0.10 145);             /* leaf green */
  --radius: 0.625rem;
  /* sidebar tokens → align to primary/mint */
  --sidebar: oklch(0.985 0.006 168);
  --sidebar-foreground: oklch(0.20 0.015 168);
  --sidebar-primary: oklch(0.52 0.085 168);
  --sidebar-primary-foreground: oklch(0.985 0.01 168);
  --sidebar-accent: oklch(0.90 0.05 168);
  --sidebar-accent-foreground: oklch(0.28 0.07 168);
  --sidebar-border: oklch(0.90 0.008 110);
  --sidebar-ring: oklch(0.52 0.085 168);
}
```
> If there's a `.dark` block, mirror with darker surfaces / lighter text in the same hue family
> (primary can lighten to ~`oklch(0.70 0.09 168)` on dark). If the app doesn't actually offer dark
> mode yet, leave `.dark` as-is — don't add a dark-mode feature in a theme round.

## Part 2 — Migrate the 37 hardcoded files to tokens

The app uses Tailwind v4 with the shadcn token utilities, so map raw color classes → token classes.
This is a **deterministic find/replace** by role (verified frequencies in parens):

| Hardcoded (raw) | Token utility |
| --- | --- |
| `bg-indigo-600`, `bg-blue-600`, `bg-blue-500` | `bg-primary` |
| `hover:bg-indigo-700`, `hover:bg-blue-600/700` | `hover:bg-primary/90` |
| `text-indigo-600`, `text-blue-600` | `text-primary` |
| `text-indigo-900`, `text-blue-800` | `text-primary` (or `text-foreground` if it's body text) |
| `ring-indigo-500`, `ring-blue-500` | `ring-ring` |
| `border-indigo-500`, `border-blue-500` | `border-primary` (or `border-input` for form fields) |
| `bg-indigo-50`, `bg-indigo-100`, `bg-blue-50` | `bg-accent` (light mint surface) |
| `text-indigo-100` (on dark primary bg) | `text-primary-foreground` |
| `hover:text-blue-800`, `hover:text-indigo-500` | `hover:text-primary/80` |
| `from-indigo-600` / `to-*` (gradients) | replace gradient with solid `bg-primary` (no gradients — flatter, cleaner; matches the calm aesthetic) |

Rules for the migration:
- Work file by file (the 37 listed in the audit). After each, the file should render the same layout
  in the new palette.
- **Semantic colors stay literal:** `red`/`green`/`amber`/`yellow` used for *status* (risk badges,
  success/error, safety alerts) are NOT brand colors — leave them (or move to `--destructive`/
  semantic tokens, but do NOT turn a red safety alert green). Only migrate the *brand* blues/indigos/
  teals.
- Risk-level colors: keep the existing semantic scale (none/low = green-ish, moderate = amber,
  high/imminent = red). Don't let the green primary collide with "low risk green" — if they're too
  close, nudge the risk scale to clearly distinct hues. The **safety/SI alert stays red.**
- Charts (recharts in MeasureTrend/ClientAnalytics): point series colors at `var(--chart-1..n)` /
  `var(--primary)` / `var(--destructive)` instead of hardcoded hex.

> Don't over-engineer: a careful sweep with the table above handles ~90%. Spot-check each file
> visually after.

## Part 3 — Widen the app shell

The pinch is `max-w-7xl` (1280px). Widen:
- `src/app/layout.js` and `src/app/(dashboard)/layout.js`: the content wrapper
  `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` → **`mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8`**
  (1536px). Keeps side padding, uses far more of a wide screen.
- `Navbar.js`: match the same `max-w-screen-2xl` so the nav aligns with the content width.
- Sanity-check a few dense pages (client detail tabs, calendar, dashboard) at the new width — nothing
  should stretch awkwardly; grids with `auto-fit`/`grid-cols-*` will just breathe more. If any fixed
  2-col layout looks too sparse at 1536px, that's a per-page tweak for the next (visible) round, not
  here.

## Acceptance criteria

1. The whole app renders in the Mint Clinical palette — primary actions are deep teal-green, light
   surfaces are mint, neutrals are warm-gray. No leftover indigo/blue brand color.
   `grep -rn "indigo-\|blue-600\|blue-500\|teal-[0-9]" src/app --include=*.js --include=*.jsx` →
   only semantic/literal status uses remain (and ideally none brand).
2. Changing `--primary` in `globals.css` now visibly re-themes the app globally (proof the migration
   worked — test by temporarily tweaking it).
3. Safety/SI alerts and risk badges are still clearly red/amber — NOT recolored green.
4. App shell is `max-w-screen-2xl`; content uses the wider screen; nav aligns; no broken layouts.
5. Charts use token/`--chart-*` colors, not hardcoded hex.
6. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
feat(cognicare): Mint Clinical palette — set design tokens (primary teal-green, mint accent)
refactor(cognicare): migrate hardcoded indigo/blue/teal to design tokens (37 files)
feat(cognicare): widen app shell to max-w-screen-2xl
fix(cognicare): chart series use --chart tokens; preserve semantic risk/safety colors
```

## Next: the visible round
With tokens + palette + width settled, the visible round does: landing page (fix pricing to
$69/$59, kill dead footer links — careers/blog/resources, tighten layout), and replace the
meaningless dashboard animation with an honest **6-agent pipeline visual** (assessment → diagnostic →
treatment → progress → documentation, + LIAM as the in-session copilot) that doubles as the landing
hero. Then PHI last.
