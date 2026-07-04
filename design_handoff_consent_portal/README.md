# Handoff: CogniCare client-portal consent page restyle

## Overview
Restyle the **public client-facing consent portal** to the "Sky" system. This is the last old-gray-Tailwind
screen in the app. Single file:
`src/app/(app)/client-portal/consent/[token]/page.js`. Mock: `CogniCare Consent Portal.dc.html` (in this
bundle) — its top **state switcher is mock chrome only** (not part of the page); it lets you see the three
real states below.

Public, **mobile-first**, no session — the URL token is the only auth. Keep it plain-language, big tap
targets, readable.

## ⚠️ Styling only — preserve ALL logic
Do NOT change behavior. Keep intact exactly as-is:
- `useParams` token, the `fetch(/api/consent-forms/${token}?token=true)` load + loading/error states.
- `isMinor` branch (`form.type === "minor"`) → the guardian name label + **"Relationship to minor"** field.
- `canSubmit` memo, `handleSubmit` → `POST /api/consent-forms/sign` + the signed-state re-fetch by `formId`.
- All state (`typedName`, `guardianRelationship`, `agreed`, `submitting`), the `required` attributes, the
  disabled/`submitting` button state, `ConsentMarkdown` for `form.body`, the download link
  (`signedDocumentUrl || documentUrl`), and the **ESIGN Act** checkbox copy verbatim.
Only markup/classes change.

## Design tokens (Sky — `src/app/globals.css`)
Navy `#0B2B6B`, primary `#2F80FF`, teal `#158A98`, green `#3B9E57`, amber `#A9821F`, danger `#C0392B`,
muted `#55698F`/`#8298BC`/`#A6B8D4`, border `#DCE6F3`/`#E7EEF7`/`#E9F0F9`, inset `#F7FAFE`, card `#fff`,
page bg `#EEF4FB`. Headings **Bricolage Grotesque**; UI **Hanken Grotesk**; the consent **body copy** uses
**Source Serif 4** (matches the report deliverable — reads as a formal document). Card radius 20, shadow
`0 22px 50px -40px rgba(11,43,107,.4)`; inputs/buttons radius 11–12.

## Layout (match the mock)
Centered column, `max-width ~560px`, generous mobile padding.
- **Practice mark** above the card: logo tile + practice name (Bricolage). Use `@/components/Brand` if it
  fits; else the small tile shown.
- **Card** (white rounded-20): eyebrow "CONSENT FORM" + Bricolage title (`form.title`), then
  "Version {n} · <status pill>". **Status pill scale:** signed → green `#E7F6EC`/`#3B9E57`; awaiting →
  amber `#FBF2DA`/`#A9821F`.
- **Body** (`form.body` via `ConsentMarkdown`): soft-sky (`#F7FAFE`) inset panel, border `#E7EEF7`, radius 14,
  `max-height` scroller, Source Serif 4 body. (Keep the `max-h` overflow behavior.)
- **Awaiting state** (form): "Your full name" (or guardian label when minor) `border-input` field with
  focus ring `0 0 0 3px rgba(47,128,255,.16)` + `border-primary`; minor → the extra Relationship field;
  the ESIGN checkbox (restyle the box, keep the copy); full-width primary **"Sign electronically"** button
  (→ "Signing…" + disabled when `!canSubmit`).
- **Signed state**: green success panel (`#EAF7EF`/`#CDE9D6`) with a check icon + "electronically signed on
  {date}" and the primary **"Download signed copy"** button (keep `downloadUrl` + target/rel).
- **Error state** (`error && !form`): centered card — red-tint icon tile, Bricolage "Link unavailable",
  the `{error}` message, and the "contact your counselor" line.
- Loading → replace the bare "Loading…" with the branded `@/components/ui/Spinner` (size ~40), centered.
- Optional footer microcopy: "Secured by {practice} · Your information is private & encrypted".

## Files in this bundle
- `CogniCare Consent Portal.dc.html` — visual target (needs `support.js` beside it).
- `support.js` — prototype runtime.

## Source of truth (live @ `main`)
`src/app/(app)/client-portal/consent/[token]/page.js`, `@/components/ai/ConsentMarkdown`,
`@/components/ui/Spinner`, `src/app/globals.css`. This page sits inside the `(app)` route group but is
intentionally **public/full-bleed** — it renders its own full-screen background; do not add the app
container/nav.
