# Round 19.2 — Landing/about/contact/login polish

> `src/app/page.js` + about/contact/login. Small fixes.

## 1. Reduce "CogniCare" repetition on landing (appears 8×)
Keep it in: the nav logo, the hero H1, and ONE mention in body copy. Replace the rest with
"the platform", "CogniCare's", "it", or just drop. Don't force it — aim for ~3-4 total, reading
naturally. (Brand should appear enough to register, not every paragraph.)

## 2. Contact page — fix email
`src/app/contact/page.js` L50: `support@cognicare.com` → **`cognicare@anansi.xyz`**.
Also `src/app/api/clients/[id]/invoices/generate/route.js` L369: `info@cognicare.com` →
`cognicare@anansi.xyz` (consistency). Grep `grep -rn "cognicare.com" src` → none left.

## 3. Contact page — the FAQ link
L168 links to `/faq`, which we're deleting (#5). Remove that FAQ link (or point it to `#features`
on the landing). Don't leave a link to a deleted page.

## 4. About + Contact consistency check
- Read both; ensure tone/wording matches the (now-correct) product: 6 agents + LIAM, no false
  claims (no "HIPAA compliant", no client limits, real $69/$59 if pricing mentioned).
- About L16 "Cognitive Care Collective" — fine as a tagline; just confirm nothing else is stale
  (no invented founding dates/team if untrue — soften to honest language).
- Make sure both pages use the Option-C tokens (no leftover hardcoded colors) and the same
  header/footer pattern as the landing for consistency.

## 5. Delete the FAQ page
`rm -rf src/app/faq/`. Then grep `grep -rn "/faq" src` → remove any remaining links (the contact one
in #3, and check the landing footer/nav).

## 6. Login page cleanup
`src/app/(auth)/login/page.js` L52-65: the "Back to Home" arrow link feels out of place on a login
screen. **Remove it** (the nav/logo already lets users get home; a back-arrow on a focused auth page
is clutter). Scan the rest of the page for the same blue-on-blue / over-`accent` issues and tidy:
clean centered card, logo, form, "Don't have an account? Sign up" link. Keep it minimal.

## 7. Landing nav color (your question)
The landing `<header>` (page.js L~47) is `bg-white shadow-sm`. The in-app Navbar is `bg-primary`
(blue). **Recommendation: keep the landing nav white** — a clean white nav over a white hero is the
modern SaaS norm and lets the hero/CTA carry the color. Making it blue would compete with the hero.
**Optional:** add a subtle `border-b border-border` instead of `shadow-sm` for a flatter, cleaner
edge. Your call — no change needed if you like it.

## 8. App width (your question)
Already `max-w-screen-2xl` (1536px). If you want more: change both `src/app/layout.js` &
`src/app/(dashboard)/layout.js` and `Navbar.js` from `max-w-screen-2xl` → `max-w-[1700px]`.
My take: 1536px is already generous; go wider only if it still feels cramped on your monitor.
Quick to try — change the three, eyeball, revert if too sparse.

## Acceptance
- "CogniCare" ~3-4× on landing, reads naturally.
- All emails `cognicare@anansi.xyz`; no `cognicare.com` left.
- `/faq` deleted; no links to it anywhere.
- Login has no "Back to Home" arrow; page is clean.
- about/contact consistent, no stale/false claims, tokenized colors.
- `npm run lint` clean; `npm run build` succeeds.

## Commit
```
fix(cognicare): trim brand repetition, real contact email, delete faq, clean login, polish about/contact
```
