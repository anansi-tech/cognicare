"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useLiam } from "./LiamProvider";
import { renderWithCitations } from "./citations";

function TypingBubble() {
  return (
    <div className="mb-3 flex items-end gap-2">
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          background: "#F1F6FC",
          borderRadius: "16px 16px 16px 4px",
          padding: "10px 14px",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block rounded-full bg-[#8298BC] animate-bounce"
            style={{ width: 6, height: 6, animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
          />
        ))}
      </div>
    </div>
  );
}

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
      <SheetContent side="right" className="flex w-full flex-col sm:w-[480px] sm:!max-w-[480px] p-0">
        {/* Header */}
        <SheetHeader className="shrink-0 border-b border-[#E3ECF7]" style={{ padding: "16px 20px" }}>
          <div className="flex items-center gap-[10px]">
            <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: "#0B2B6B", flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 512 512" fill="none">
                <path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" stroke="#25B9C8" strokeWidth="46" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <SheetTitle style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 17, color: "#0B2B6B", margin: 0, lineHeight: 1.2 }}>
                Ask LIAM
              </SheetTitle>
              {clientName && (
                <p style={{ fontSize: 12.5, color: "#8298BC", margin: "2px 0 0", lineHeight: 1 }}>
                  · grounded in {clientName}&apos;s record
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {!clientId ? (
          <p className="px-5 py-5 text-sm text-muted-foreground">
            Open a client to consult LIAM about them.
          </p>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col" style={{ padding: "0 16px 16px" }}>
            {/* Message list */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto py-4" style={{ paddingRight: 4 }}>
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Ask about this client — risk flags, recent sessions, intervention ideas.
                </p>
              )}
              {messages.map((msg) => {
                const text = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("");
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[82%] whitespace-pre-wrap text-sm"
                      style={{
                        background: isUser ? "#2F80FF" : "#F1F6FC",
                        color: isUser ? "#fff" : "#24344F",
                        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        padding: "9px 13px",
                        lineHeight: 1.5,
                      }}
                    >
                      {isUser ? text : renderWithCitations(text, clientId)}
                    </div>
                  </div>
                );
              })}
              {status === "streaming" && <TypingBubble />}
            </div>

            {/* Composer */}
            <div>
              <div className="relative flex items-end rounded-2xl border border-input bg-background shadow-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask LIAM…"
                  rows={2}
                  className="resize-none border-0 bg-transparent pr-12 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || status === "streaming"}
                  aria-label="Send"
                  className="absolute bottom-1.5 right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: "#8298BC", marginTop: 6, textAlign: "center" }}>
                Verify before clinical use
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
