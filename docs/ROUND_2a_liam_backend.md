# Round 2a — LIAM Backend (streaming agent + thread memory)

> Hand to Claude Code. Branch `dev`, working dir `products/cognicare`. You have the repo.
> This is the backend half of LIAM. The UI (shadcn Sheet + Cmd-K) is Round 2b and depends on the
> streaming contract this round establishes — so finish and smoke-test 2a before 2b.

## What LIAM is

LIAM is the renamed conversational agent: an **in-session clinical copilot**. The therapist is with
a client *right now* and asks LIAM quick questions ("any prior SI flags?", "what did we cover last
week?", "good CBT homework for this presentation?"). LIAM answers from this client's own record —
the client, recent sessions, recent agent reports, and the **MBC measure trends + risk flags** built
in Round 1 — plus the running conversation. Per the clinical-UX decision, LIAM is not a blank
chatbot: it **proactively surfaces safety signals** and grounds answers in the client's history.

Unchanged from the old conversational agent: the retrieval pattern (client + recent sessions +
recent reports). New: streaming, per-client thread memory, the MBC context, citation tokens, and
`gpt-5.5`.

## Runtime correction

LIAM runs on **Node**, not edge (`export const runtime = "nodejs"` in the route). It needs Mongoose
and the `fs`-based prompt loader. Ignore the original plan's "edge for /api/liam/chat" line.

---

## Step 1 — Bump to AI SDK 5 (its own commit)

`package.json`: `ai@^5`, `@ai-sdk/openai@^2`, add `@ai-sdk/react@^2`. Run install.

The Round 1 specialists call `generateObject({ model, schema, schemaName, messages })` — that
signature is stable across v4→v5, so they should keep working. **Verify**: fire one specialist
(`POST /api/ai/assessment`) after the bump and confirm the envelope still validates. If `generateObject`
complains, the only likely change is message shape — adapt minimally, don't redesign.
`src/lib/ai/client.js` (`createOpenAI` + `openai(model)`) stays as-is.

Commit: `chore(cognicare): bump to AI SDK 5`.

---

## Step 2 — Thread memory model + helper

### `src/models/liamThread.js`

```js
// LiamThread: per-(userId, clientId) conversation memory for the in-session copilot.
import mongoose from "mongoose";

const liamThreadSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    turns: [{
      role: { type: String, enum: ["user", "assistant"], required: true },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    rollingSummary: { type: String, default: "" }, // older turns, compressed
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

liamThreadSchema.index({ userId: 1, clientId: 1 }, { unique: true });

export default mongoose.models.LiamThread || mongoose.model("LiamThread", liamThreadSchema);
```

### `src/lib/ai/liam/memory.js`

Keep the last `KEEP_TURNS` verbatim; when the thread grows past that, fold the overflow into
`rollingSummary` with the cheap background model. Simple and bounded.

```js
import { generateText } from "ai";
import { openai, MODELS } from "@/lib/ai/client";
import { connectDB } from "@/lib/mongodb";
import LiamThread from "@/models/liamThread";

const KEEP_TURNS = 12; // verbatim recent turns; older ones live in rollingSummary

export async function getThread(userId, clientId) {
  await connectDB();
  return (
    (await LiamThread.findOne({ userId, clientId })) ||
    new LiamThread({ userId, clientId, turns: [], rollingSummary: "" })
  );
}

// Text block for the prompt: rolling summary + recent verbatim turns.
export function buildMemoryBlock(thread) {
  if (!thread?.turns?.length && !thread?.rollingSummary) return "## Conversation\n(none yet)";
  const recent = thread.turns
    .slice(-KEEP_TURNS)
    .map((t) => `${t.role === "user" ? "Therapist" : "LIAM"}: ${t.content}`)
    .join("\n");
  const summary = thread.rollingSummary ? `Earlier (summary): ${thread.rollingSummary}\n` : "";
  return `## Conversation\n${summary}${recent}`;
}

// Append the latest exchange; compress overflow into rollingSummary.
export async function appendExchange(thread, userText, assistantText) {
  thread.turns.push({ role: "user", content: userText });
  thread.turns.push({ role: "assistant", content: assistantText });
  thread.lastActiveAt = new Date();

  if (thread.turns.length > KEEP_TURNS) {
    const overflow = thread.turns.slice(0, thread.turns.length - KEEP_TURNS);
    thread.turns = thread.turns.slice(-KEEP_TURNS);
    const transcript = overflow.map((t) => `${t.role}: ${t.content}`).join("\n");
    const { text } = await generateText({
      model: openai(MODELS.background),
      messages: [{
        role: "user",
        content:
          `Update this running summary of a therapist↔copilot conversation. Keep it under 150 words, ` +
          `clinically relevant, factual.\n\nCurrent summary:\n${thread.rollingSummary || "(none)"}\n\n` +
          `New turns to fold in:\n${transcript}`,
      }],
    });
    thread.rollingSummary = text.trim();
  }
  await thread.save();
  return thread;
}
```

---

## Step 3 — LIAM prompt

### `prompts/liam.system.md`

```md
You are LIAM, an in-session clinical copilot for a licensed mental-health therapist. The therapist
is with a client right now and consults you with quick questions about this client or session.

You are given: the client record, recent sessions, recent specialist reports, and the client's
measure trends (e.g. PHQ-9 / GAD-7 with reliable-change applied and any risk flags), plus the
running conversation. Use them as your primary source; supplement with general clinical knowledge.

How to respond:
- Be brief and lead with the answer. The therapist is mid-session — no preamble, no filler.
- Proactively surface safety signals. If the context shows a suicidal-ideation flag, an "imminent"
  or "high" risk level, or a worsening measure trend, say so early and plainly, even if not asked.
- Ground claims in THIS client's history. When you reference a specific session or report, cite it
  with a token the UI turns into a link: [session:<id>] or [report:<id>]. Only cite IDs that appear
  in the provided context. Never cite an ID you weren't given.
- For intervention/homework suggestions, prefer evidence-based options matched to the working
  diagnosis or presentation, and say in a phrase why.
- Distinguish what's specific to this client from general guidance.
- Never invent history, scores, or facts that aren't in the context. If something's missing, say so.
- You are decision support for a licensed professional. Inform their judgment; don't issue directive
  medical or legal orders.
- Write naturally and professionally. No JSON, no headers, no bullet scaffolding unless it genuinely
  aids a quick read.
```

---

## Step 4 — LIAM agent (streaming)

### `src/lib/ai/liam/agent.js`

Reuses `buildClientBlock` from Round 1 (`src/lib/ai/context.js`) so LIAM gets the same client +
sessions + reports + **MBC trends/flags** the specialists see. Prompt order is static-first for
caching: system → client context → memory → user turns.

```js
import { streamText, convertToModelMessages } from "ai";
import { openai, MODELS } from "@/lib/ai/client";
import { loadPrompt } from "@/lib/ai/prompts";
import { buildClientBlock } from "@/lib/ai/context";
import { buildMemoryBlock } from "./memory";

// `uiMessages` are the AI SDK UI messages from useChat (parts-based).
export async function streamLiam({ clientId, thread, uiMessages }) {
  const system = await loadPrompt("liam.system");
  const clientBlock = await buildClientBlock(clientId);   // includes MBC trends + flags
  const memoryBlock = buildMemoryBlock(thread);

  return streamText({
    model: openai(MODELS.clinical),
    system: `${system}\n\n${clientBlock}\n\n${memoryBlock}`,
    messages: await convertToModelMessages(uiMessages),
  });
}
```

> `loadPrompt("liam.system")` resolves `prompts/liam.system.md` (dot in the name is fine — the loader
> just appends `.md`).

---

## Step 5 — Streaming route

### `src/app/api/liam/chat/route.js`

```js
import { getCurrentUser } from "@/lib/auth";
import { streamLiam } from "@/lib/ai/liam/agent";
import { getThread, appendExchange } from "@/lib/ai/liam/memory";

export const runtime = "nodejs"; // Mongoose + fs prompt loader — not edge.

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { clientId, messages } = await req.json();
  if (!clientId || !messages?.length) return new Response("clientId and messages required", { status: 400 });

  const thread = await getThread(user.id, clientId);
  const result = await streamLiam({ clientId, thread, uiMessages: messages });

  // last user message text (parts-based UI message)
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = (lastUser?.parts ?? [])
    .filter((p) => p.type === "text").map((p) => p.text).join("") || lastUser?.content || "";

  return result.toUIMessageStreamResponse({
    onFinish: async ({ text }) => {
      try { await appendExchange(thread, userText, text); }
      catch (e) { console.error("LIAM memory persist failed", e); }
    },
  });
}
```

> If the installed AI SDK 5 exposes the final text under a different field in `onFinish`, adapt the
> destructure (it's `text` in current 5.x). Persisting memory must never break the stream — hence the
> try/catch.

---

## Step 6 — Delete the conversational stub

Delete `src/app/api/ai/conversational/route.js` (the 410 from Round 1.1). LIAM at `/api/liam/chat`
replaces it. Grep to confirm nothing imports or fetches `/api/ai/conversational` anymore (the old
`SessionAssistant` widget still might — leave that widget for Round 2b, where it's replaced; if it
calls the dead path before 2b, that's a known temporary gap, not a regression to fix here).

---

## Acceptance criteria (smoke)

1. After the SDK bump, `POST /api/ai/assessment { clientId }` still returns a valid envelope.
2. `POST /api/liam/chat` with `{ clientId, messages: [{ role:"user", parts:[{type:"text",text:"any prior risk flags?"}] }] }`
   returns a streaming response (SSE) that renders incremental text. (Test with `curl -N` or a tiny
   fetch reader.)
3. Seed a client with a PHQ-9 administration where item-9 > 0, then ask LIAM about risk — the reply
   names the suicidal-ideation flag **proactively/early**, and cites a `[session:<id>]` or
   `[report:<id>]` token whose ID exists in that client's data.
4. Ask a follow-up that relies on the previous turn (pronoun/reference) — LIAM resolves it, proving
   thread memory. Inspect `liam_threads`: a doc exists for `(userId, clientId)` with the turns.
5. Send 13+ turns; confirm `rollingSummary` populates and `turns` stays capped at 12.
6. `grep -rn "conversational" src/app/api` returns nothing; `/api/ai/conversational` route file gone.

## Suggested commits

```
chore(cognicare): bump to AI SDK 5
feat(cognicare): LiamThread model + per-client memory with rolling summary
feat(cognicare): LIAM system prompt + streaming agent (reuses MBC client context)
feat(cognicare): /api/liam/chat streaming route (nodejs) + delete conversational stub
```

## Round 2b preview (next, after 2a smoke-passes)

Minimal shadcn install (init + `Sheet`, `Button`, `ScrollArea`, `Input`) + `cmdk`. A responsive LIAM
surface: right-rail `Sheet` on desktop / bottom sheet on mobile, opened from the top bar, from Cmd-K,
or auto-opened on a client/session page and **auto-bound to that route's clientId**. `useChat` from
`@ai-sdk/react` wired to `/api/liam/chat`; render `message.parts`; turn `[session:<id>]` /
`[report:<id>]` tokens into clickable citation chips that deep-link. Delete the old
`SessionAssistant.js`. This also bootstraps the shadcn migration the later UX round completes.
