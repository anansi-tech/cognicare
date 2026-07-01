# Handoff: CogniCare App Shell restyle (authenticated pages → "Sky" system)

## Overview
Two related tasks for the authenticated (post-login) app:

1. **Bug fix — missing page padding.** Pages like `/billing`, `/clients`, `/sessions`, `/reports`,
   `/team`, `/audit`, `/settings`, `/profile` render **edge-to-edge** (no left/right gutters, no
   max-width). `/dashboard` looks fine.
2. **Visual restyle.** Bring the authenticated navbar + all app pages into the same "Sky" look &
   feel as the redesigned marketing pages (Landing, About, Contact) — navy Bricolage headings,
   soft-sky surfaces, tinted icon tiles, token colors, pill buttons.

`CogniCare App Shell.dc.html` (in this bundle) is the **visual target** — a prototype of the redesigned
authenticated **Navbar, Dashboard, Clients data-table, Subscription/Billing, the LIAM chat sheet, and the
loader/spinner**. Open it in a browser; the navy pill bar at the top is **reviewer chrome** (page switcher +
"Open LIAM"), **not part of the app** — don't build it. Detailed specs are in the numbered sections below
(1 = padding fix, 2 = restyle system, 3 = Clients table, 4 = LIAM sheet, 5 = spinner).

---

## 1. The padding bug — root cause & fix

**Cause:** the shared padded container only exists in **one** route group. `src/app/(dashboard)/layout.js`
wraps content in:
```jsx
<main className="py-6">
  <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">{children}</div>
</main>
```
…but **only `/dashboard` lives inside `(dashboard)/`**. Every other authed page is a **top-level route**
(`src/app/billing/`, `src/app/clients/`, etc.), so it renders straight into the **root** layout's
`<main className="min-h-screen bg-background">` (`src/app/layout.js`) — which has **no max-width and no
horizontal padding**. `billing/page.js`'s own root is just `py-10` (vertical only) → full-bleed.

**Fix (recommended — URL-safe, one source of truth):**
- Create a shared route-group layout, e.g. `src/app/(app)/layout.js`, containing the padded container
  (same as the dashboard one: `min-h-screen bg-secondary` wrapper → `<main className="py-6"><div
  className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">{children}</div></main>`).
- **Move** the authenticated page folders into that group: `dashboard`, `billing`, `clients`, `sessions`,
  `reports`, `team`, `audit`, `settings`, `profile`, `client-portal`, `invite`, `checkout` (any post-login
  page). Route-group parens **don't change the URL**, so `/billing` etc. keep working. Delete the now-redundant
  `(dashboard)/layout.js` (fold it into the new `(app)/layout.js`), or just rename `(dashboard)` → `(app)`
  and move the sibling folders in.
- **Do NOT** add the container to the root `src/app/layout.js` `<main>` — the marketing/auth pages
  (Landing, About, Contact, Login, Signup) intentionally run **full-bleed** (navy gradient heroes, split
  auth panels). A global container would break those.

**Quick alternative** (if you don't want to move folders): add
`mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8` to each app page's root wrapper. Works, but it's duplicated
and easy to forget on new pages — prefer the route-group fix.

Verify after: `/billing`, `/clients`, `/reports`, `/settings` all have the same left/right gutters and
max-width as `/dashboard`.

---

## 2. The restyle — from raw grays to the "Sky" system

Today the app pages use raw Tailwind grays and a loud flat navbar; the marketing pages use the token-based
Sky system. Unify them. **This is styling only — preserve every bit of existing logic, data fetching,
auth, routing, and state** (dashboard stats fetch, billing Stripe checkout/portal, session redirects, etc.).

### Token swaps (do this everywhere)
Replace hardcoded grays with the existing `globals.css` tokens:

| Replace | With |
|---|---|
| `text-gray-900` (headings/values) | `text-foreground` (navy `#0B2B6B`) |
| `text-gray-600` / `text-gray-500` | `text-muted-foreground` |
| `bg-white` (cards) | `bg-card` |
| `bg-gray-50` (card footers, hover rows) | `bg-secondary` / `bg-muted/40` |
| `border-gray-200` / `border-gray-100` | `border-border` |
| `text-purple-600`, ad-hoc stat colors | the chart ramp: `text-chart-1`(green) `-2`(teal) `-3`(blue) `-4`(cyan) `-5`(navy) |
| status pills `bg-green-100/text-green-800` etc. | keep semantic, but soften to the Sky tints (see prototype badges) |

### Typography
- **Headings → Bricolage Grotesque** (the `--font-bricolage` var is already loaded in `layout.js`; expose a
  `font-heading`/utility or use `style={{fontFamily:'var(--font-bricolage)'}}`), weight 700,
  `tracking-[-0.02em]`. Page H1 ~34px, card H2 ~18–20px.
- Body/UI stays Hanken Grotesk (`--font-hanken`) / the sans default.
- Each page gets a header block: **eyebrow** (13px uppercase, `tracking-[0.12em]`, `text-primary`) +
  **Bricolage H1** + muted subtitle. (See prototype: "OVERVIEW / Good morning, Dr. Reyes", "BILLING / Subscription".)

### Cards & surfaces
- Page background: soft sky (`bg-secondary` / `#EEF4FB`–`#F2F7FD`), cards `bg-card` on top.
- Card radius **18–20px** (`rounded-2xl`-ish), border `border-border`, soft shadow
  `shadow-[0_22px_50px_-40px_rgba(11,43,107,0.4)]`. Hover-lift on interactive cards
  (`hover:-translate-y-[3px]` + stronger shadow + `hover:border-[#C7DCF5]`), 200ms.
- **Stat cards:** replace emoji with a **tinted icon tile** (44px, `rounded-xl`, tint bg + colored line
  icon from lucide-react) → muted label → big Bricolage value in the accent color → primary "View all →" link.
  Mapping in the prototype: Clients=blue, Active sessions=teal, Completed=green, Reports=cyan.
- **List rows** (schedule, activity): row hover `bg-secondary`/`#F5F9FE`, dividers `border-border`,
  status as a soft rounded pill.

### Navbar (`src/app/components/Navbar.js`) — authed state
Currently a solid bright-blue bar (`bg-primary`) with white links. Restyle the **authenticated** branch to
match marketing (keep all logic — session, active-route, user menu, mobile menu, Ask LIAM, sign-out dialog):
- Bar: translucent near-white `bg-background/86` + `backdrop-blur`, `border-b border-border` (like the
  marketing nav). Height ~62px, same `max-w-screen-2xl` gutters.
- Left: logo mark + **`<Brand />`** wordmark (navy "Cogni" + teal "Care"), then nav links in
  `text-[#55698F]` → hover/active `text-foreground` with a **2.5px `bg-primary` underline** on the active route.
- Right: **"Ask LIAM ⌘K"** as a soft pill (`bg-[#EAF3FF] text-primary`, hover `#E0EDFF`) — keep the
  `setLiamOpen(true)` handler and ⌘K; user chip = navy avatar circle (initials) + name + chevron, keep the
  dropdown (Profile / Subscription / Settings / Sign out) and the sign-out confirm dialog exactly as-is.
- The unauthenticated/public branch already matches marketing — leave it.
- Note: the prototype shows a subset of links for space; **keep the real link set and the
  `isPracticeOwner` gating** for Team / Audit / Subscription.

### Apply across all app pages
**Mocked in the prototype:** Navbar, Dashboard, Subscription/Billing, Clients (data table), the LIAM chat
sheet, and the loader/spinner. Apply the **same system** to the remaining pages using their existing content
and logic: `sessions` (+ `sessions/calendar`), `reports`, `team`, `audit`, `settings`, `profile`,
`client-portal`, and the components under `src/components/*` (ai, billing, liam, measures, sessions) that
those pages render. Tables/lists follow the **Clients** pattern (§3); loaders use the **Spinner** (§5).

### Billing specifics (already mocked)
- Keep `useSession` gating, the non-owner read-only view, `subscribe()` → `/api/billing/checkout`,
  `openPortal()` → `/api/billing/portal`, the seats input + `seats × $59` calc, `NEXT_PUBLIC_STRIPE_PRICE_*`
  env wiring, and all `busy`/status states. Only the markup/classes change.
- Selected/`highlight` plan → `border-primary` + `ring-4 ring-primary/10`; "Most popular" badge as a
  primary pill; primary CTA `bg-primary` with the glow shadow; secondary CTA soft `bg-[#EAF3FF] text-primary`.

---

## 3. Clients — data-table page (`src/app/components/clients/ClientList.js`)
Now mocked in the prototype ("Clients" tab) as the reference for **every list/table page** (also apply to
sessions, reports, team, audit). **Styling only — keep all existing logic:** the `/api/clients` fetch, the
`status`-keyed effect, client-side `searchTerm`/`statusFilter` filtering, the Add-Client modal + `ClientForm`
+ `handleClientAdded` navigation, `ageFromDob`/`genderLabel`, and the error/empty states.

- **Header row:** eyebrow + Bricolage H1 "Clients" + muted count on the left; **"Add new client"** primary
  pill (with a plus icon) on the right — keeps `setShowAddClient(true)`.
- **Toolbar:** search input with a leading magnifier icon (`rounded-xl border-border`, focus `ring-2
  ring-ring`) bound to `searchTerm`; status filter as a **segmented control** (All / Active / Inactive /
  Completed — the existing `<select>` values), active segment `bg-[#EAF3FF] text-primary`. (Keep it a
  `<select>` on mobile if simpler.)
- **Table → styled card:** wrap in a `bg-card` rounded-2xl with soft shadow, `overflow-hidden`. Header row
  `bg-[#F6FAFE]`, uppercase 11.5px muted labels. Body rows: hover `bg-secondary`, divider `border-border`,
  **name cell = colored initials avatar + name** (name → `text-foreground`, hover `text-primary`; keep the
  `/clients/[id]` `Link`). Columns unchanged: Name · Age/Gender · Status · Last updated · Actions ("View →").
- **Status pill mapping** (replaces the current green/gray/accent/yellow): active → green
  (`bg-[#E7F6EC] text-[#3B9E57]`), completed → blue (`bg-[#E4F1FF] text-primary`), inactive → slate
  (`bg-[#EEF1F5] text-[#6E7E97]`), transferred → amber (`bg-[#FBF2DA] text-[#A9821F]`).
- **Footer:** "Showing N of M" + pagination pills (only if you already paginate; otherwise omit — don't add
  pagination the API doesn't support).
- **Empty state:** keep the existing two messages, styled muted/centered inside the card.
- **Add-Client modal:** restyle the overlay to the Sky system (rounded-2xl card, navy heading, `border-border`
  inputs) but keep `ClientForm` and its props untouched.

## 4. LIAM chat — the "Ask LIAM" sheet (`src/components/liam/LiamSheet.jsx`)
Mocked in the prototype (click **"Ask LIAM"** in the app nav, or "Open LIAM" in the reviewer bar). This is a
**restyle of the existing `LiamSheet`** — it already uses `@ai-sdk/react`'s `useChat`, the
`/api/liam/chat` transport keyed by `clientId`, streaming status, `renderWithCitations`, and the
shadcn `Sheet`. **Keep all of that.** Only restyle the presentation:

- **Sheet:** right-side, 480px (`sm:w-[480px]`), keep the shadcn `Sheet`/`SheetContent side="right"`.
- **Header:** logo tile + "Ask LIAM" (Bricolage) + `clientName` subtitle ("· grounded in her record"). Keep
  the `!clientId` empty message ("Open a client to consult LIAM about them.").
- **Messages:** user → `bg-primary text-primary-foreground`, right-aligned, bubble radius `16px 16px 4px 16px`;
  assistant → `bg-[#F1F6FC] text-[#24344F]`, left, `16px 16px 16px 4px`. Keep `renderWithCitations` — style
  the citation chips as small `bg-[#E4F0FF] text-primary` superscript pills (they stay clickable).
- **Streaming indicator:** replace the plain "LIAM is thinking…" text with the **three-dot typing bubble**
  (shown in the mock) while `status === "streaming"`. Keep auto-scroll-to-bottom.
- **Composer:** rounded `border-input` container, focus `ring-2 ring-ring`; keep the `Textarea`,
  Enter-to-send / Shift+Enter newline, and the **circular send button** (now navy `bg-foreground`
  `ArrowUp`, disabled when empty/streaming). Add the small "Verify before clinical use" disclaimer line.
- **Suggestion chips** (Draft a SOAP note / Intervention ideas / Recent sessions) are an *optional* nicety —
  only wire them if you want them to prefill `sendMessage`; otherwise drop them. Don't fake them.

## 5. Loader / spinner (used app-wide)
Replace the current flat two-border ring (`animate-spin rounded-full border-t-2 border-b-2 border-primary`,
used in `ClientList` and page-level "Loading…" states) with a **branded gradient ring** (shown on the
"Loader" tab). Make it one small component, e.g. `src/components/ui/Spinner.jsx`, and use it everywhere:

```jsx
// size in px; ring thickness scales with it
export function Spinner({ size = 40, className = "" }) {
  const t = Math.max(2, Math.round(size / 8)); // stroke thickness
  return (
    <span
      role="status" aria-label="Loading"
      className={`inline-block animate-spin ${className}`}
      style={{
        width: size, height: size, borderRadius: "50%",
        background:
          "conic-gradient(from 90deg, rgba(47,128,255,0) 8%, #25B9C8 55%, #2F80FF 92%)",
        WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${t}px), #000 calc(100% - ${t}px))`,
        mask: `radial-gradient(farthest-side, transparent calc(100% - ${t}px), #000 calc(100% - ${t}px))`,
      }}
    />
  );
}
```
- **Full-page / route loading:** centered 56px Spinner + muted "Loading …" label (replace the current
  `<div className="text-center p-4">Loading...</div>` and the `ClientList` spinner block).
- **Section loading:** 40px. **Inline / in-button:** 16–22px — inside buttons use a white-tinted variant
  (swap the two blue stops for `rgba(255,255,255,.6)` → `#fff`) next to "Signing in…" / "Creating account…".
- Uses the existing Tailwind `animate-spin`. Respects `prefers-reduced-motion` if you gate it (optional).

---

## Design Tokens (all already in `src/app/globals.css` — Sky palette)
| Role | Hex | Token |
|---|---|---|
| Navy heading/text | `#0B2B6B` | `--foreground` / `--chart-5` |
| Primary blue | `#2F80FF` | `--primary` / `--ring` |
| Teal | `#158A98` | `--accent` / `--chart-2` |
| Cyan | `#25B9C8` | `--chart-4` |
| Green | `#4DBB6A` | `--chart-1` |
| Soft sky surface | `#F2F7FD` / `#EEF4FB` | `--secondary` |
| Card / near-white | `#FCFEFF` | `--card` / `--background` |
| Muted text | `#55698F` / `#8298BC` | `--muted-foreground` |
| Border | `#E3ECF7` / `#E9F0F9` | `--border` |

Fonts already wired in `src/app/layout.js`: Bricolage Grotesque (`--font-bricolage`), Hanken Grotesk
(`--font-hanken`). Wordmark via existing `@/components/Brand`.

## Assets & icons
- Wordmark → `@/components/Brand`. Logo mark → `public/logo-icon.svg` / `logo-nav-white.svg`.
- **Replace all emoji** (👥 💬 ✅ 📊 📝 📅) with **lucide-react** icons in tinted tiles (the marketing pages
  already use inline stroke SVGs — match that weight: `stroke-width 2`, round caps).

## Files in this bundle
- `CogniCare App Shell.dc.html` — the redesign target. Reviewer pill bar switches between **Dashboard,
  Clients, Subscription, and Loader**; **"Open LIAM"** (top-right) or any **"Ask LIAM"** button opens the
  chat sheet. Needs `support.js` beside it to open. The pill bar is reviewer-only, not part of the app.
- `support.js` — prototype runtime.

## Source-of-truth files (live @ `main` `686d7ef`)
`src/app/layout.js` · `src/app/(dashboard)/layout.js` · `src/app/(dashboard)/dashboard/page.js` ·
`src/app/billing/page.js` · `src/app/components/Navbar.js` · `src/app/components/clients/ClientList.js` ·
`src/components/liam/LiamSheet.jsx` · `src/components/Brand.jsx` · `src/app/globals.css`.
Diff against these — they define the logic you must preserve.
