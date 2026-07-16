# Handoff: CogniCare Client Overview v2 — navigator rail + continuous clinical document

## Overview
Restructure the client **Overview** tab (`/clients/[id]`) from stacked collapsible panels into a
two-column "clinical record": a sticky navigator rail + a continuous document with sticky per-section
action headers. Mock: `CogniCare Client Overview v2.dc.html` (needs `support.js`). Its Tweaks
(`draftDiagnosis`, `editingAssessment`, `showReviseNudge`) preview the states.

This is a **re-composition + restyle** — every hook, fetch, and behavior is preserved.

## Files
- `src/app/components/clients/ClientDetail.js` — header card, overview tab layout (rail + document grid),
  move/remove info cards, MeasureGlance relocation.
- `src/app/components/clients/ClientInsights.js` — sections become non-collapsible document entries;
  actions move into section headers; add scroll-spy ids.
- `src/components/ai/Section.jsx` — sticky header w/ action slot (shared with session view — keep the
  session usage working; new props must be backward-compatible).
- `src/components/ai/editable.jsx` — `EditApproveBar` content folds into the header action slot.
- Do NOT touch `useEditableReport`, `AgentReportBody` bodies, cascade/staleness logic, or any API calls.

## ⚠️ Logic to preserve (exact)
- `useEditableReport` per section (ax/dx/tx/px): `startEdit`, `setEdited`, `approve`, `saveState`,
  `canEdit`, `isEditing`.
- Cascade gating: `cascadeAllowed`, `upstreamStale` hash checks, `runCascade(from)` + confirms,
  `reviseTreatment` (+ version chain semantics), `reviseNudge` selection (diagnostic wins over assessment),
  regenError inline display.
- `MeasureGlance` fetches; `assessmentExists` branches (baseline card pre-intake); IntakeAssessment +
  ReassessmentBanner placement above the grid (full-width, both columns); tab alias/URL sync; LIAM binding.
- Draft/approved semantics: `report.status === "draft"`, re-editing an approved report, SaveIndicator states.

## Layout
Grid: `252px minmax(0,1fr)`, gap 24, `align-items: start`. Collapse to single column < ~1000px (rail
becomes a horizontal scroll chip-row under the tabs; facts card folds below document).

### Rail (position: sticky; top: 20px)
1. **"Clinical picture" nav card** (white rounded-16, padding 10): uppercase 11px `#8298BC` label; one
   button per section — status dot (7px: green `#3B9E57` approved / amber `#E3B341` draft or
   reassessment-recommended / slate `#A6B8D4` neutral), 13px/600 label, 11px `#A6B8D4` meta line (status ·
   updated date). Active item: bg `#EAF3FF`, text `#2F80FF`, weight 700. **Scroll-spy** via scroll listener
   on section offsets (or IntersectionObserver); click scrolls to section top −16px (`window.scrollTo`,
   smooth — NOT scrollIntoView per project conventions is fine here; standard anchor scroll ok in app).
   Items: Assessment / Diagnostic impression / Treatment plan vN / Progress report / Intake note.
2. **Score chips** — 2-up grid reusing MeasureGlance data: shortName eyebrow, Bricolage 21px score +
   trend arrow (green ↓ improved / slate →), band label. Replaces the horizontal chip row in the main column.
3. **Client facts card** — label/value rows (Email, Phone, Emergency, DOB (age), Client since) with
   hairline dividers. This REPLACES the "Basic Information" + "Contact Information" cards (delete them —
   name/status/gender/age already live in the page header).

### Document column (flex column, gap 18)
Sections in clinical order, **never collapsed** (drop `collapsible`/`defaultOpen` from Section usage on
this page): Assessment, Diagnostic impression, Treatment plan vN, Progress report, then **Intake note**
(the old Initial Assessment card, moved to the end; keeps its "+ New session" action as an icon button).

**Sticky section header** (inside each rounded-20 card):
`position: sticky; top: 0; z-index: 5; background: rgba(255,255,255,.94); backdrop-filter: blur(6px);`
border-bottom `#EEF3FA`, radius `20px 20px 0 0`, padding 14px 20px. Left: logo tile (existing 30px navy
tile) + Bricolage 16px title (+ muted vN on treatment) + 11.5px muted "Updated {date}" line; Progress adds
the amber "Reassessment recommended" badge next to the title. Right — **the action slot, all states**:
- **Approved:** green pill `Approved` (`#E7F6EC`/`#3B9E57`) + pencil **icon button** (32px, border
  `#E3ECF7`, radius 9, hover `#EAF3FF`/`#2F80FF`) → `startEdit`. Treatment also gets a revise icon button
  (circular-arrow, tooltip "Revise plan (new version)") → `reviseTreatment`, shown when `!cascadeAllowed`
  (replaces the bottom "Revise plan" text link).
- **Draft:** amber pill `Draft — review` (`#FBF2DA`/`#A9821F`) + pencil icon + green **Approve** button
  (bg `#3B9E57`, white, radius 9, check icon, 12.5px/700) → `tx.approve`.
- **Editing:** `SaveIndicator` text ("Saving…"/"Saved"/"Couldn't save") + primary blue **Done** button
  (check icon) that exits edit mode. Body renders the editable branch as today.
This removes `EditApproveBar`'s in-body bar and the bottom "Edit …" text links entirely — same functions,
one location, always visible.

**Section body** (padding 4px 20px 20px): summary strip first (existing `#F2F7FD` style), then the
existing `AgentReportBody` read/edit bodies unchanged. Draft sections tint their card border `#F0DFAE`.

**Nudges** (CascadeOffer / reviseNudge): slim amber strip (`#FEF9EC`/`#F6E6BC`, radius 11) directly
UNDER the section header (not at the body bottom): message + compact amber button. Same conditions,
handlers, and confirm dialogs.

### Header card (top of page)
Replace the text buttons with **icon buttons** (32px, tooltips via `title`): reassign (swap-arrows —
wraps the existing `ReassignControl` trigger), edit (pencil → `setIsEditing(true)`), delete (trash,
red hover `#FDECEC`/`#C0392B` → `handleDeleteClient`). Add "Next session {date}" to the meta line if the
data is already at hand (recentSessions has it); skip if not.

## Session view
`Section.jsx` is shared with SessionAIInsights. Add the header-action slot as an optional prop
(`actions`, `sticky`) with defaults preserving current behavior, then adopt it in the session view too
if trivial — otherwise leave the session view for a follow-up.

## Tokens
All Sky (globals.css): navy `#0B2B6B`, primary `#2F80FF`, green `#3B9E57`, amber pills `#FBF2DA`/`#A9821F`,
nudge `#FEF9EC`/`#F6E6BC`, borders `#E3ECF7`/`#EEF3FA`, muted `#55698F`/`#8298BC`/`#A6B8D4`,
active nav `#EAF3FF`. Bricolage headings, Hanken body.
