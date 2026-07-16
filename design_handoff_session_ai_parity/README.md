# Handoff: Session view AI-insights parity (document mode)

## Overview
Bring the session view's AI insights in line with Overview v2's document pattern. Today
`SessionAIInsights.js` renders Treatment plan + Progress report (`focus="session"`) as **collapsible,
default-CLOSED** legacy Sections — two clicks to see anything. Change them to the existing
**document mode** (`Section.jsx` already supports it — no Section changes needed).
Mock: `CogniCare Session Detail v2.dc.html` (needs `support.js`).

## ⚠️ Styling/markup only — preserve all logic
`SessionAIInsights.js`: keep the dual fetch (session-scoped progress, client-scoped
assessment/diagnostic/treatment), `pickLatest`, `focus="session"` gating, empty states, loading/error.
The session view stays **read-only** — no edit/approve here; editing lives in the client Overview.
Do NOT touch `SessionDetail.js` logic, `SessionNote`, AutoSessionPrep/AutoPostSession, RegenerateButton
behavior, or the cancel/no-show/delete dialog.

## Changes
1. **SessionAIInsights sections → document mode.** For each rendered Section pass `sticky`, `subtitle`,
   and `actions`; drop `collapsible`/`defaultOpen`. Report data is already in state.
   - Subtitle: Treatment `"Client-scoped · Updated {MMM d}"`; Progress `"This session · Generated {MMM d}"`
     (same `toLocaleDateString` short format as ClientInsights). Assessment/Diagnostic (the
     `focus !== "session"` branch, if any caller uses it): `"Updated {MMM d}"`.
   - Actions: status pill (approved → green `#E7F6EC`/`#3B9E57`; draft → amber `#FBF2DA`/`#A9821F`
     "Draft — review"; reuse the exact pill styles from `SectionHeaderActions`) + an **IconButton**
     (from `@/components/ai/editable`) with an external-link icon, `title="Open in client record"`,
     that routes to `/clients/{clientId}?tab=overview` (`useRouter().push`) — the anchor ids
     (`#sec-treatment` etc.) exist there but tab-state + scroll timing makes deep anchoring fragile;
     plain tab navigation is enough. Treatment title keeps the muted `v{version}` suffix if version
     is in the payload envelope (add it to state only if already returned by the API — do not change
     the API).
   - Wrap the two sections in `display:flex; flexDirection:column; gap:16` (replace `space-y-6`).
2. **SessionDetail.js — markup-only touches (optional but in the mock):** header action buttons become
   IconButtons (pencil / trash, plus amber-hover no-show + ghost cancel icons only if clean — keep text
   buttons for no-show/cancel if icon meaning is unclear; mock shows pencil+trash only for a completed
   session where no-show/cancel don't render anyway). RegenerateButton may become an icon button ONLY
   if its busy/disabled states are preserved; otherwise leave it.
3. **Sticky offset:** inside the session page the sections sit in a card, not full-bleed — use the same
   `top: 64` as Overview v2 (below the app navbar).

## Load-bearing copy — do not reword
Empty-state strings ("Generated automatically when you open a scheduled session." etc.), the
"Analysis available" pill, and all dialog copy in SessionDetail. Status pill labels must match the
Overview v2 vocabulary exactly ("Approved", "Draft — review").

## Source of truth (live @ `main`)
`src/app/components/sessions/SessionAIInsights.js`, `src/app/components/sessions/SessionDetail.js`,
`src/components/ai/Section.jsx` (document mode — already shipped, do not modify),
`src/components/ai/editable.jsx` (`IconButton`).
