# Handoff: Session view v3 — rail + continuous clinical document (Overview v2 parity)

## Overview
Restyle the session view (`SessionDetail.js` + `SessionNote.jsx` + `SessionAIInsights.js`) into the same
layout pattern as the client Overview v2: **sticky navigator rail (left) + continuous document (right)**,
same Section/pill/typography vocabulary. **UI only — no functionality changes.**
Mock: `CogniCare Session Detail v3.dc.html` (needs `support.js`). Tweaks: `noteDraft` (SOAP draft state:
Saving… + "Approve note" in the sticky header), `showStaleNudge`.

## ⚠️ Load-bearing — do not alter behavior, only appearance
1. **Staleness nudge:** render condition (`!isEditing && notesStale`), copy verbatim ("Session notes changed
   since this note and progress were generated. Regenerate them? This replaces the current versions."),
   `regenerateFromNotes` wiring incl. the `window.confirm` copy and `staleRegenBusy`/`staleRegenError`.
   In the mock it moves INSIDE the Session-note section, between sticky header and body (same slot as the
   Overview's revise nudge) — position change only.
2. **SessionNote autosave + flush-on-unload:** debounce refs, `pagehide`/`visibilitychange` listeners,
   unmount flush, canonical-hash no-op. **Do not remount or restructure the component lifecycle** — restyle
   its markup in place; keep it mounted exactly once, same position in the tree relative to `isEditing`.
3. **`onNotesStale` contract** between SessionAIInsights and SessionDetail (referentially stable callback).
4. **Status pills:** "Draft — review" / "Approved" vocabulary; SessionNote keeps its own
   "Draft — not in record" label. "Open in client record" deep-link (`/clients/{id}?tab=overview`) stays.
5. **Read-only document mode** for client-level reports — no edit/approve in the session view.
6. **Confirm-dialog copy carries destructive semantics** ("replaces the current versions") — don't soften.
7. **Labels are exact:** "Revise treatment plan", "Regenerate note & progress", "Edit plan" are different
   operations — never merge or reword.

## Layout (mock)
- Page header unchanged (eyebrow SESSION, Bricolage title + status pill, meta line, IconButtons; the
  scheduled-state Mark no-show / Cancel buttons keep rendering as today).
- Below header: **grid `252px minmax(0,1fr)`, gap 24, align-items start** (collapse to single column +
  chip-row nav under ~1000px, same fallback as Overview v2).
- **Rail (sticky top 84 under the app navbar):**
  - Nav card "THIS SESSION": items = Session information / Session note / Treatment plan v{n} /
    Progress report. Dot colors: green approved, amber `#E3B341` draft/needs-review. Meta line under each
    label (status · date). Scroll-spy highlight (`#EAF3FF` bg, blue label) — same mechanics as Overview v2's
    rail; reuse its component/helpers if they were extracted, otherwise copy the pattern.
  - Client chip card: avatar (`@/lib/avatar`), name → link to client record.
  - Measure chips (PHQ-9/GAD-7) — ONLY if MeasuresPanel data is already available in compact form; otherwise
    keep MeasuresPanel as its own document section and drop the chips. Do not add new fetches.
- **Document column** (`gap 18`):
  1. **Session information** — merged card: Session information + Record details two-column grid (existing
     InfoRows). "Session notes" raw-notes preview may sit as an InfoRow (mock) or keep its current box.
     MeasuresPanel stays in this region if not railed.
  2. **Session note (SOAP)** — becomes a document-mode section: sticky header (logo tile, title,
     "SOAP · This session" subtitle) with the status pill + **Edit note** IconButton (pencil) when approved,
     or SaveIndicator + **Approve note** primary button when draft/editing — i.e. the actions MOVE from the
     bottom of SessionNote into its sticky header; same handlers, same states. Draft state gets the amber
     border tint (`#F0DFAE`) like Overview v2. Nudge strip sits directly under this header (see §1).
  3. **Treatment plan v{n}** — as shipped (document mode, read-only, Approved pill + open-in-record).
  4. **Progress report** — same, with draft pill when draft.
- AutoSessionPrep / AutoPostSession / RegenerateButton keep their current mount position and wiring at the
  top of the AI region (above the Session note section); only container styling may change. The "AI insights"
  card wrapper dissolves — sections sit directly in the document column like Overview v2; keep the
  "Analysis available" pill next to a small "AI insights" run-in header row if desired (mock omits it —
  fine either way).

## Sticky offsets
Section headers `top: 64` (below app navbar); rail `top: 84`. Same values as the shipped Overview v2.

## Source of truth (live @ `main`)
`src/app/components/sessions/SessionDetail.js`, `src/components/sessions/SessionNote.jsx`,
`src/app/components/sessions/SessionAIInsights.js`, `src/components/ai/Section.jsx` (do not modify),
`src/components/ai/editable.jsx`, the Overview v2 rail in `src/app/components/clients/ClientInsights.js`.
