"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLiam } from "./LiamProvider";
import { renderWithCitations } from "./citations";

export function LiamSheet() {
  const { open, setOpen, clientId, clientName } = useLiam();
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  // `id` keyed by clientId resets the view when the bound client changes.
  // Server memory is per-(user,client) anyway, so each client has its own thread.
  const { messages, sendMessage, status } = useChat({
    id: clientId ?? "none",
    transport: new DefaultChatTransport({
      api: "/api/liam/chat",
      body: () => ({ clientId }),
    }),
  });

  // Auto-scroll to the bottom when a new message arrives or while the
  // assistant is still streaming.
  const lastMessageText = messages.at(-1)?.parts
    ?.filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("") ?? "";
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, lastMessageText, status]);

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
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            Open a client to consult LIAM about them.
          </p>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-2 px-4 pb-4">
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto pr-2">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask about this client — risk flags, recent sessions, intervention ideas.
                </p>
              )}
              {messages.map((msg) => {
                const text = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("");
                return (
                  <div key={msg.id} className={msg.role === "user" ? "mb-3 text-right" : "mb-3"}>
                    <div className={`inline-block whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.role === "assistant" ? renderWithCitations(text, clientId) : text}
                    </div>
                  </div>
                );
              })}
              {status === "streaming" && <p className="text-xs text-muted-foreground">LIAM is thinking…</p>}
            </div>

            <div className="flex gap-2">
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
