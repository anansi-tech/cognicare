# Handoff: CogniCare Reports — structured generation + HTML→PDF deliverable + viewer restyle

## Overview
Three connected changes to the compiled-report feature (`/clients/[id]/reports/[reportId]/view` + its PDF):
1. **Structured generation** — have the synthesis step emit **sectioned markdown** instead of one prose blob.
2. **HTML→PDF deliverable** — replace the hand-drawn `pdf-lib` PDF with a Sky-branded HTML/CSS template
   rendered to PDF (letterhead, metadata panel, sectioned body, risk callout, signature block).
3. **On-screen viewer restyle** — Sky system; render the finalized narrative as formatted prose (not a
   monospace `<textarea>`); keep the textarea for draft editing only.

Two mocks in this bundle:
- `CogniCare Report Deliverable.dc.html` — the **PDF target** (open it; it's a letter-sized paged doc — use
  the browser print preview to see pagination). Needs `doc-page.js` beside it.
- `CogniCare Report Viewer.dc.html` — the **on-screen viewer** (read + draft states). Needs `support.js`.

## Current state (what's there today)
- `POST /api/clients/[id]/reports` → `synthesizeReport()` in **`src/lib/ai/agents/report.js`** returns one
  freeform prose string, stored as `report.content.narrative` (+ `content.sources`).
- PDF: **`src/lib/report-pdf.js`** (`buildReportPdf`, pdf-lib) draws a bold-blue practice line, a `Title
  Report`, four `Client:/Period:/Prepared by:/Status:` lines, then wraps the narrative as undifferentiated
  paragraphs. Helvetica only; `sanitizeWinAnsi` strips non-Latin-1. Draft watermark, AI disclosure, footer.
  Streamed by `src/app/api/clients/[id]/reports/[reportId]/pdf/route.js`.
- Viewer: **`src/app/(app)/clients/[id]/reports/[reportId]/view/page.js`** — old gray Tailwind; narrative in
  a **monospace textarea** even when completed; old two-border spinner; `bg-yellow-100/green-100` status pill.

## 1. Structured generation (`src/lib/ai/agents/report.js`)
- Update the `synthesizeReport` prompt so the model returns **markdown with `##` section headings**, using a
  **fixed, ordered section vocabulary** so downstream rendering is predictable. Suggested set (omit a section
  if there's genuinely nothing for it — don't fabricate):
  `## Summary` · `## Presenting concerns` · `## Clinical formulation` · `## Treatment provided` ·
  `## Progress` · `## Risk` · `## Plan & recommendations`.
  Keep the existing constraints (only assert what the sources support; note limited source material).
- **Storage unchanged in shape:** still store the markdown string in `report.content.narrative`. Existing
  reports (plain prose, no headings) must still render — treat a narrative with no `##` as a single
  "Summary"/untitled section (back-compat).
- Optional: add a tiny parser `parseReportSections(md) → [{ title, body }]` in a shared lib (e.g.
  `src/lib/reports/sections.js`) used by BOTH the PDF builder and the viewer, so headings parse identically.

## 2. HTML→PDF deliverable — match `CogniCare Report Deliverable.dc.html`
Replace the `pdf-lib` drawing in `buildReportPdf` with an **HTML/CSS template rendered to PDF**. Keep the
route (`.../pdf/route.js`) and its `buildReportPdf({...})` signature so callers don't change; swap the
internals.

**Rendering approach (agreed): HTML→PDF.** Options, pick per your stack:
- **Puppeteer / headless Chrome** — render a styled HTML string, `page.pdf({ format: "Letter",
  printBackground: true, margin: 0 })`. Best fidelity (real CSS, web fonts, the accent bars + risk callout
  render exactly like the mock). Heaviest dep; needs a Chromium in the serverless runtime
  (`@sparticuz/chromium` on Vercel) — confirm the deploy target supports it.
- **`@react-pdf/renderer`** — no browser; JSX→PDF with a flexbox subset. Lighter/serverless-friendly, but
  it's not real CSS, so re-express the layout in its primitives. Good enough for this document.
Recommend Puppeteer if the runtime allows (fidelity to the mock); else react-pdf.

**Layout to reproduce (see mock):**
- **Letterhead (page 1):** logo tile + practice name (Bricolage) + address/phone line; a 2px navy rule;
  "CLINICAL DOCUMENTATION" eyebrow. (Practice address/phone: pull from the Practice model if available,
  else omit the line — don't hardcode.)
- **Title** "{Type} Report" (Bricolage, ~27px navy).
- **Metadata panel** — soft-sky (`#F4F8FD`, border `#E3ECF7`, radius 12) 4-up grid: Client (+ age/gender),
  Reporting period, Prepared by (clinician + credentials), Source records count, Status pill
  (completed→green `#E7F6EC`/`#3B9E57`, draft→amber `#FBF2DA`/`#A9821F`).
- **Body** — **serif** (Source Serif 4 / Georgia), 12.5px, line-height ~1.62, color `#33465F`. Each parsed
  section: a small accent bar (`#2F80FF`) + UPPERCASE Bricolage 14px navy heading, then its paragraph(s).
  `break-inside: avoid` on each section block.
- **Risk section → distinct callout:** if a `## Risk` section exists, render it as the red-left-border card
  (`#FDF6F5` bg, `#F0D9D6` border, 4px `#C0392B` left border) with a warning icon + "RISK ASSESSMENT"
  heading. (If no risk section, skip the callout.)
- **Signature block:** two columns — clinician name + credentials + "Clinician of record · License #…" over
  a navy rule; "Date signed" + date over a light rule. (License #: from the user/clinician record if
  present, else omit.)
- **AI disclosure** italic line + **running footer** on every page: "Generated {stamp} · {practice} ·
  Confidential clinical record" + page number.
- **Draft state:** keep the watermark behavior — a diagonal/again-per-page "DRAFT" mark and the amber note;
  drafts still export (with watermark) exactly as today.
- **Fonts:** embed Bricolage Grotesque + Source Serif 4 (Puppeteer: `<link>` Google Fonts and `waitUntil:
  "networkidle0"`; react-pdf: `Font.register`). Note this **removes the `sanitizeWinAnsi` limitation** —
  real Unicode (smart quotes, em dashes, →, ≤) now renders; you can drop the transliteration map.
- **Filename/headers** in the route stay (`{type}-report-{id}.pdf`, inline vs `?download=1`).

## 3. On-screen viewer restyle — match `CogniCare Report Viewer.dc.html`
`src/app/(app)/clients/[id]/reports/[reportId]/view/page.js`. **Styling + read-mode rendering only — keep all
logic:** the two fetches, `extractNarrative`, `save()`/`save("completed")`/`save("draft")`, draft/finalize
busy states, `sources` memo, the PDF preview/download links, toasts.
- Page: Sky, back link, white rounded-20 card, eyebrow + Bricolage "{Type} Report" + "Prepared by …".
- Actions: **Preview PDF** (ghost) + **Download PDF** (primary) — keep the `pdfUrl` / `?download=1` hrefs.
- **Metadata panel** — same soft-sky 4-up grid as the deliverable (Client, Period, Generated, Status pill +
  "N source records").
- **Draft banner** (when `isDraft`) — amber callout with the existing copy.
- **Narrative — two modes:**
  - **Completed (read):** render the markdown as **formatted prose** — parse sections (shared
    `parseReportSections`) into accent-bar Bricolage headings + serif body (Source Serif 4, 14px/1.65). No
    textarea. (If a report has no `##` headings, render the whole thing as one prose block.)
  - **Draft (edit):** keep an editable field, but restyle — a serif-font `<textarea>` (`border-input`, focus
    `ring-2 ring-ring`), not monospace. Bound to `narrative` exactly as now.
- Actions row: draft → **Save draft** (ghost) + **Mark as completed** (primary, disabled when empty);
  completed → **Re-open as draft** (ghost). Same handlers.
- **Source records** — Sky bordered list: agent type (navy) + timestamp (muted) + summary. Keep `sources`.
- Loading → `<Spinner size={40}>`; error/not-found → Sky alert.

## Design tokens (Sky — `src/app/globals.css`)
Navy `#0B2B6B`, primary `#2F80FF`, teal `#158A98`, green `#3B9E57`, amber `#A9821F`, danger `#C0392B`,
muted `#55698F`/`#8298BC`, border `#E3ECF7`/`#E9F0F9`, soft-sky panel `#F4F8FD`/`#EEF4FB`, card `#fff`.
Headings **Bricolage Grotesque**; **document body serif = Source Serif 4** (this is the one place we use a
serif — it reads as a formal clinical document and separates deliverable prose from UI). UI text stays Hanken.

## Files in this bundle
- `CogniCare Report Deliverable.dc.html` (+ `doc-page.js`) — PDF target; print-preview to see pagination.
- `CogniCare Report Viewer.dc.html` (+ `support.js`) — on-screen viewer (read + draft).

## Source of truth (live @ `main`)
`src/lib/ai/agents/report.js` (synthesis prompt) · `src/lib/reports/generate.js` (`gatherAgentReports`) ·
`src/lib/report-pdf.js` (`buildReportPdf` — to be reimplemented) ·
`src/app/api/clients/[id]/reports/[reportId]/pdf/route.js` ·
`src/app/(app)/clients/[id]/reports/[reportId]/view/page.js` · `src/models/report.js` · `src/app/globals.css`.
