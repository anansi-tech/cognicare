# Round 2b — LIAM UI (Sheet + Cmd-K + citation chips)

> Hand to Claude Code. Branch `dev`, working dir `products/cognicare`. You have the repo.
> 2a built the streaming backend at `/api/liam/chat`. This round gives LIAM a surface and deletes
> the old conversational UI chain. This also bootstraps the shadcn migration the later UX round finishes.

## The surface, in one paragraph

LIAM lives in a right-rail `Sheet` on desktop (full-width/bottom on mobile), opened from a top-bar
"Ask LIAM" button, from **Cmd-K**, or auto-opened on a client/session page. It's **bound to the
current route's client** — on a client or session page it knows the `clientId` and consults that
client. Replies stream in; `[session:<id>]`/`[report:<id>]` tokens become clickable chips that
deep-link. There is no per-page "AI Assistant" tab anymore — LIAM is global.

---

## Step 1 — Minimal shadcn install

The project is Tailwind v4 + JavaScript with CSS variables already in `globals.css`, and `@/*` path
aliases in `jsconfig.json`. Initialize shadcn for **JS** (no TypeScript):

```bash
npx shadcn@latest init        # choose: JavaScript (tsx=false), use existing globals.css / CSS vars
npx shadcn@latest add sheet button scroll-area input command textarea
```

This creates `components.json`, `src/lib/utils.js` (the `cn` helper), and `src/components/ui/*`.
Don't hand-edit the generated `ui/*` files. If init asks to overwrite `globals.css` tokens, keep the
existing palette — only add tokens shadcn needs that are missing.

Commit: `chore(cognicare): init shadcn (sheet, button, scroll-area, input, command, textarea)`.

---

## Step 2 — LIAM context (route binding + open state)

### `src/components/liam/LiamProvider.js`

```jsx
"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LiamContext = createContext(null);

export function LiamProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");

  // Cmd-K / Ctrl-K opens LIAM from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bindClient = useCallback((id, name = "") => {
    setClientId(id);
    setClientName(name);
  }, []);

  return (
    <LiamContext.Provider value={{ open, setOpen, clientId, clientName, bindClient }}>
      {children}
    </LiamContext.Provider>
  );
}

export const useLiam = () => {
  const ctx = useContext(LiamContext);
  if (!ctx) throw new Error("useLiam must be used within LiamProvider");
  return ctx;
};
```

Wrap the dashboard shell with `<LiamProvider>` (in `src/app/(dashboard)/layout.js`), and render
`<LiamSheet />` once inside it. On the client page (`src/app/clients/[id]/page.js`) and session page
(`src/app/sessions/[id]/page.js`), call `useLiam().bindClient(clientId, clientName)` in an effect so
LIAM auto-binds. Optionally `setOpen(true)` to auto-open on those pages (the plan wanted auto-open;
make it opt-in via a small "Consult LIAM" button if auto-open feels intrusive — your call).

---

## Step 3 — Citation chips

### `src/components/liam/citations.jsx`

Turn `[session:<id>]` / `[report:<id>]` tokens into links. Session → `/sessions/<id>`;
report → `/clients/<clientId>/reports/<id>` (the existing report view route).

```jsx
import Link from "next/link";

const TOKEN = /\[(session|report):([a-f0-9]{24})\]/gi;

export function renderWithCitations(text, clientId) {
  const out = [];
  let last = 0, m, i = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [, kind, id] = m;
    const href = kind === "session" ? `/sessions/${id}` : `/clients/${clientId}/reports/${id}`;
    out.push(
      <Link key={`c${i++}`} href={href}
        className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground hover:underline">
        {kind === "session" ? "Session" : "Report"}
      </Link>
    );
    last = TOKEN.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
```

---

## Step 4 — The LIAM sheet (useChat wired to /api/liam/chat)

### `src/components/liam/LiamSheet.jsx`

```jsx
"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLiam } from "./LiamProvider";
import { renderWithCitations } from "./citations";

export function LiamSheet() {
  const { open, setOpen, clientId, clientName } = useLiam();
  const [input, setInput] = useState("");

  // `id` keyed by clientId resets the view when the bound client changes.
  // Server memory is per-(user,client) anyway, so each client has its own thread.
  const { messages, sendMessage, status } = useChat({
    id: clientId ?? "none",
    transport: new DefaultChatTransport({
      api: "/api/liam/chat",
      body: () => ({ clientId }),
    }),
  });

  const send = () => {
    const text = input.trim();
    if (!text || !clientId) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:w-96">
        <SheetHeader>
          <SheetTitle>Ask LIAM{clientName ? ` · ${clientName}` : ""}</SheetTitle>
        </SheetHeader>

        {!clientId ? (
          <p className="text-sm text-muted-foreground">Open a client to consult LIAM about them.</p>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask about this client — risk flags, recent sessions, intervention ideas.
                </p>
              )}
              {messages.map((msg) => {
                const text = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("");
                return (
                  <div key={msg.id} className={msg.role === "user" ? "mb-3 text-right" : "mb-3"}>
                    <div className={`inline-block rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.role === "assistant" ? renderWithCitations(text, clientId) : text}
                    </div>
                  </div>
                );
              })}
              {status === "streaming" && <p className="text-xs text-muted-foreground">LIAM is thinking…</p>}
            </ScrollArea>

            <div className="mt-2 flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask LIAM…"
                rows={2}
                className="resize-none"
              />
              <Button onClick={send} disabled={!input.trim() || status === "streaming"}>Send</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

> If the installed `useChat` exposes loading differently than `status === "streaming"` (some 5.x
> minors use `status === "in_progress"` / a boolean), adjust that one check — confirm against the
> version that resolved in `package-lock.json`.

---

## Step 5 — Entry points

- **Top bar:** add an "Ask LIAM" button (and a faint "⌘K" hint) in the dashboard top bar / `Navbar.js`
  that calls `useLiam().setOpen(true)`.
- **Cmd-K:** already wired in `LiamProvider` (toggles open).
- **Auto-bind:** client + session pages call `bindClient(...)` on mount (Step 2).

---

## Step 6 — Delete the old conversational UI chain

This is the three-link dead chain from 2a's analysis. Remove all of it:

- Delete `src/app/components/sessions/SessionAssistant.js`.
- Delete `src/app/api/sessions/[id]/ai-assist/route.js` (it only proxied to the deleted
  `/api/ai/conversational`).
- In `src/app/components/clients/ClientDetail.js`: remove the `"ai-assistant"` tab and its
  `SessionAssistant` render. Don't refactor the rest of the file — just excise the tab button + panel.
- In `src/app/components/clients/ClientInsights.js`: the links that did
  `window.location.href = …?tab=ai-assistant` should instead open LIAM. Simplest: import `useLiam`,
  call `setOpen(true)` (the page already bound the client). Remove the tab-navigation hrefs.

Grep after: `grep -rn "SessionAssistant\|ai-assist\|tab=ai-assistant" src` returns nothing.

---

## Acceptance criteria (smoke)

1. `npm run dev` boots; `npm run lint` clean; shadcn `ui/*` components render.
2. On a client page, **Cmd-K** opens the LIAM sheet titled with the client's name; the top-bar
   "Ask LIAM" button does the same.
3. Type a question, hit Enter → the reply **streams** token-by-token into the sheet.
4. A reply containing `[session:<id>]` renders a "Session" chip; clicking it navigates to
   `/sessions/<id>`. A `[report:<id>]` chip navigates to the report view.
5. With no client bound (e.g. on the dashboard root), the sheet shows "Open a client to consult LIAM."
6. Switch to a different client → the conversation view resets (new `id`), and LIAM answers about the
   new client.
7. `grep -rn "SessionAssistant\|ai-assist" src` → nothing. No route 500s when using the AI Assistant
   affordances anywhere.
8. Mobile width: the sheet is usable (full-width is fine).

## Suggested commits

```
chore(cognicare): init shadcn (sheet, button, scroll-area, input, command, textarea)
feat(cognicare): LiamProvider — route-bound client + Cmd-K open
feat(cognicare): LiamSheet — useChat streaming UI + citation chips
refactor(cognicare): delete SessionAssistant + ai-assist chain; route AI-assist entry points to LIAM
```

## After 2b: LIAM is done → Round 3 (MBC capture + trend dashboard)

LIAM now reasons over MBC data, but there's still no UI to **administer** PHQ-9/GAD-7 or to **see the
trends**. Round 3 closes the other half of the clinical-UX bet: an in-app questionnaire flow that
writes `MeasureAdministration` docs (via `scoreInstrument`), a trend chart on the client page driven
by `getTrend`, and the real analytics dashboard that the Round 1.1 `riskTimeline` stub is a
placeholder for. That's also when LIAM's "worsening trend" proactive signal becomes fully visible to
the therapist, not just to LIAM.
