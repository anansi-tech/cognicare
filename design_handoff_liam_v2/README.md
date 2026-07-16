# Handoff: LIAM chat v2 — history, starters, provenance, thread control

## Overview
Upgrade the LIAM sheet (`src/components/liam/LiamSheet.jsx`) with five decided improvements.
Mock: `CogniCare LIAM Chat v2.dc.html` (needs `support.js`). Tweak `view`: history / empty / confirm-clear.
Backend additions are allowed in this pass but must be additive and follow the constraints below.

## 1. History on open (additive GET)
- New `GET /api/liam/thread?clientId=` → `{ turns: [{role, content, at}], hasSummary: boolean }` —
  **last 20 turns max**, never the whole thread; auth + scope-guard through `visibleClientIds` exactly like
  the chat route (a clinician reads only their assigned clients' threads); `turns` are encrypted at rest, so
  the GET must read the **hydrated** document (full Mongoose doc so decryption hooks/getters run — never
  `.lean()` or raw projections, which return ciphertext). Decrypting turns here is expected (same data the
  chat renders) but return nothing else.
- Sheet loads it on open / client change and seeds the useChat message list (map to parts-based UI
  messages). Loading state: small centered Spinner (16–22).
- If `hasSummary`, render the marker divider above the turns: hairline — "Earlier conversation
  summarized — LIAM remembers it" — hairline (11.5px `#A6B8D4` 600). Never render the summary text itself.
- Day dividers between date groups (practice tz): "MON JUL 13" / "TODAY" — 11px 700 uppercase `#A6B8D4`,
  centered. Requires `at` timestamps on turns — add `at: Date` to the LiamThread turn subdocs on append
  (additive; old turns without `at` group under one "Earlier" divider).

## 2. Starter chips (empty state only)
Intro line: "Ask about **{firstName}** — LIAM answers from her sessions, reports, and measures, with
sources." Four chips (border `#E3ECF7`, bg `#FBFDFF`, radius 12, 13.5px 600 `#33465F`; hover blue tint):
1. "Summarize this client's progress since intake"
2. "What did we cover last session?"
3. "Any measure changes I should know about?"
4. "Draft talking points for the next session"
Clicking sends the text as a user message. Exactly these four — no scheduling/billing promises.

## 3. Richer citation chips (provenance)
- Chips become "Session · Jul 9" / "Progress report" (report chips use the report-type name; session chips
  the session date, short format, practice tz). Keep the icons, colors, hrefs, and the existing token format
  `[session:id]`/`[report:id]` — **do not change the token grammar or the LLM prompt contract.**
- Metadata source (choose the cheaper): (a) stream a data part from `/api/liam/chat` listing
  `{id, kind, date, reportType}` for cited ids (the route already touches the models), or (b) a small
  batch `GET /api/liam/citations?ids=` the client calls after each message. Either way: metadata only
  (id, kind, date, agentType/type), clientScope-checked, additive.
- Fallback when metadata isn't resolved (old messages, deleted docs): current generic "Session"/"Report"
  labels — never a broken chip.

## 4. "New topic" (clear thread) — correct semantics
- Header button (ghost, 12.5px, spark icon + "New topic") → confirm dialog (mock's copy):
  title "Start a new topic?", body "This permanently deletes LIAM's conversation history for {client} —
  including its memory of earlier discussions. LIAM will start over from her record alone.",
  Cancel ghost + **"Delete and start fresh"** danger `#C0392B`. Don't soften: the destructive copy is
  load-bearing.
- Confirm → new `DELETE /api/liam/thread?clientId=` (scope-guarded through `visibleClientIds` like the GET) that deletes turns AND `rollingSummary` (the whole
  LiamThread doc is fine), **writes an audit-log entry** (same audit mechanism as other PHI deletions —
  it's clinical-adjacent PHI), then the UI resets to the empty/starter state. Server-side clear is the
  point — a UI-only reset that leaves memory alive is the trust-breaking version.

## 5. Small touches
- **Copy button** under each assistant message (visible on hover; 11.5px `#A6B8D4`, copy icon + "Copy",
  copies plain text with citation tokens stripped; brief "Copied" feedback). Not on user messages.
- **Esc closes** the sheet (shadcn Sheet already does this — verify it isn't blocked while streaming) and
  the footer line becomes "Verify before clinical use · Esc closes".
- Keep: streaming TypingBubble, auto-scroll, disabled send while streaming, `id` keyed by clientId.

## ⚠️ Preserve
useChat transport wiring (`/api/liam/chat`, body `{clientId}`), per-(user,client) server memory
(`getThread`/`appendExchange`, KEEP_TURNS=12 rolling summary), `renderWithCitations` markdown handling,
LiamProvider open/clientId context + ⌘K binding, the no-client empty state, 480px sheet width.

## Source of truth (live @ `main`)
`src/components/liam/LiamSheet.jsx`, `src/components/liam/citations.jsx`, `src/app/api/liam/chat/route.js`,
`src/lib/ai/liam/memory.js`, `src/models/liamThread.js` (encrypted `turns`), the audit-log lib.
