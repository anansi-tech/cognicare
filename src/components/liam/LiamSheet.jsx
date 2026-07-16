"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Copy, Check, Sparkles, CircleAlert } from "lucide-react";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/Spinner";
import { useLiam } from "./LiamProvider";
import { renderWithCitations, toClipboardText } from "./citations";

const CITATION_ID = /\[(?:session|report):([a-f0-9]{24})\]/gi;

const STARTERS = [
  "Summarize this client's progress since intake",
  "What did we cover last session?",
  "Any measure changes I should know about?",
  "Draft talking points for the next session",
];

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

function Divider({ children }) {
  return (
    <div className="my-3 flex items-center gap-3">
      <span className="h-px flex-1 bg-[#E9F0F9]" />
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#A6B8D4", whiteSpace: "nowrap" }}>
        {children}
      </span>
      <span className="h-px flex-1 bg-[#E9F0F9]" />
    </div>
  );
}

function SummaryMarker() {
  return (
    <div className="my-3 flex items-center gap-3">
      <span className="h-px flex-1 bg-[#E9F0F9]" />
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#A6B8D4", whiteSpace: "nowrap" }}>
        Earlier conversation summarized — LIAM remembers it
      </span>
      <span className="h-px flex-1 bg-[#E9F0F9]" />
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(toClipboardText(text)).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
      }}
      className="mt-1 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ fontSize: 11.5, color: "#A6B8D4", background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      {copied ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <Copy className="h-3 w-3" strokeWidth={2} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function LiamSheet() {
  const { open, setOpen, clientId, clientName } = useLiam();
  const { data: authSession } = useSession();
  const tz = authSession?.user?.practiceTimezone ?? "America/New_York";
  const [input, setInput] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasSummary, setHasSummary] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [citeMeta, setCiteMeta] = useState({});
  const requestedIds = useRef(new Set());
  const seededFor = useRef(null);
  const scrollRef = useRef(null);

  // `id` keyed by clientId resets the view when the bound client changes.
  // Server memory is per-(user,client) anyway, so each client has its own thread.
  const { messages, sendMessage, status, error, clearError, setMessages } = useChat({
    id: clientId ?? "none",
    transport: new DefaultChatTransport({
      api: "/api/liam/chat",
      body: () => ({ clientId }),
    }),
  });
  const isBusy = status === "submitted" || status === "streaming";

  // A binding owns all client-specific sheet state. Releasing it on route exit
  // makes the existing no-client state authoritative outside client records;
  // rebinding even the same client starts a fresh server-history load.
  useEffect(() => {
    seededFor.current = null;
    requestedIds.current = new Set();
    setCiteMeta({});
    setHasSummary(false);
    setShowClearConfirm(false);
    setHistoryLoading(false);
    setInput("");
  }, [clientId]);

  // Seed the message list from the server thread on open / client change so
  // the conversation survives closing the sheet. Skipped mid-stream.
  useEffect(() => {
    if (!open || !clientId || isBusy) return;
    if (seededFor.current === clientId) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/liam/thread?clientId=${clientId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load LIAM history");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        seededFor.current = clientId;
        setMessages(
          (d.turns ?? []).map((t, i) => ({
            id: `h-${clientId}-${i}`,
            role: t.role,
            parts: [{ type: "text", text: t.content }],
            at: t.at ?? null,
          }))
        );
        setHasSummary(!!d.hasSummary);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId, isBusy]);

  // Resolve citation metadata for chips ("Session · Jul 9"). Batch lookup of
  // ids we haven't asked about yet; unresolved ids keep generic labels.
  useEffect(() => {
    if (!clientId || isBusy) return;
    const ids = new Set();
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      const text = m.parts?.filter((p) => p.type === "text").map((p) => p.text).join("") ?? "";
      for (const match of text.matchAll(CITATION_ID)) ids.add(match[1]);
    }
    const missing = [...ids].filter((id) => !requestedIds.current.has(id));
    if (!missing.length) return;
    missing.forEach((id) => requestedIds.current.add(id));
    fetch(`/api/liam/citations?clientId=${clientId}&ids=${missing.join(",")}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        setCiteMeta((prev) => {
          const next = { ...prev };
          for (const it of d.items ?? []) next[it.id] = it;
          return next;
        });
      })
      .catch(() => {});
  }, [messages, isBusy, clientId]);

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
  }, [messages.length, lastMessageText, status, historyLoading]);

  const send = (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || !clientId || isBusy) return;
    clearError();
    sendMessage({ text });
    setInput("");
  };

  // "New topic": server-side delete of turns AND rolling summary — a UI-only
  // reset that leaves memory alive would be the trust-breaking version.
  const clearThread = async () => {
    setClearing(true);
    try {
      const res = await fetch(`/api/liam/thread?clientId=${clientId}`, { method: "DELETE" });
      if (res.ok) {
        setMessages([]);
        setHasSummary(false);
        setShowClearConfirm(false);
      }
    } finally {
      setClearing(false);
    }
  };

  const firstName = clientName?.split(" ")[0] ?? "this client";
  const todayStr = new Date().toLocaleDateString("en-US", { timeZone: tz });
  const dayLabelFor = (msg) => {
    if (msg.at === null) return "Earlier"; // seeded turn without a timestamp
    const at = msg.at ? new Date(msg.at) : new Date(); // streamed turns are now
    if (at.toLocaleDateString("en-US", { timeZone: tz }) === todayStr) return "Today";
    return at
      .toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" })
      .replace(/,/g, "");
  };

  let lastDayLabel = null;

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
            <div style={{ minWidth: 0, flex: 1 }}>
              <SheetTitle style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 17, color: "#0B2B6B", margin: 0, lineHeight: 1.2 }}>
                Ask LIAM
              </SheetTitle>
              {clientName && (
                <p style={{ fontSize: 12.5, color: "#8298BC", margin: "2px 0 0", lineHeight: 1 }}>
                  · grounded in {clientName}&apos;s record
                </p>
              )}
            </div>
            {clientId && messages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="mr-7 inline-flex items-center gap-1.5 hover:bg-[#F2F7FD] transition-colors"
                style={{ fontSize: 12.5, fontWeight: 600, color: "#55698F", background: "none", border: "1px solid #E3ECF7", borderRadius: 9, padding: "5px 10px", cursor: "pointer", flexShrink: 0 }}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
                New topic
              </button>
            )}
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
              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size={20} />
                </div>
              ) : messages.length === 0 ? (
                <div>
                  <p className="text-sm" style={{ color: "#55698F", lineHeight: 1.55 }}>
                    Ask about <strong style={{ color: "#0B2B6B" }}>{firstName}</strong> — LIAM answers
                    from their sessions, reports, and measures, with sources.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="text-left hover:bg-[#EFF6FF] hover:border-[#C7DCF5] transition-colors"
                        style={{ border: "1px solid #E3ECF7", background: "#FBFDFF", borderRadius: 12, padding: "10px 14px", fontSize: 13.5, fontWeight: 600, color: "#33465F", cursor: "pointer", fontFamily: "inherit" }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {hasSummary && <SummaryMarker />}
                  {messages.map((msg) => {
                    const text = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("");
                    const isUser = msg.role === "user";
                    if (!isUser && !text) return null;
                    const dayLabel = dayLabelFor(msg);
                    const divider = dayLabel !== lastDayLabel ? <Divider>{dayLabel}</Divider> : null;
                    lastDayLabel = dayLabel;
                    return (
                      <div key={msg.id}>
                        {divider}
                        <div className={`group mb-3 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                          <div
                            className={`text-sm ${
                              isUser ? "max-w-[82%] whitespace-pre-wrap" : "max-w-[96%]"
                            }`}
                            style={{
                              background: isUser ? "#2F80FF" : "#F1F6FC",
                              color: isUser ? "#fff" : "#24344F",
                              borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                              padding: "9px 13px",
                              lineHeight: 1.5,
                            }}
                          >
                            {isUser ? text : renderWithCitations(text, clientId, citeMeta, tz)}
                          </div>
                          {!isUser && text && <CopyButton text={text} />}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {isBusy && <TypingBubble />}
              {error && !isBusy && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2 rounded-xl border border-[#F4D7D3] bg-[#FFF7F5] px-3 py-2.5"
                  style={{ color: "#8F3B31", fontSize: 12.5, lineHeight: 1.45 }}
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                  <span>LIAM couldn&apos;t complete that response. Please try again.</span>
                </div>
              )}
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
                  onClick={() => send()}
                  disabled={!input.trim() || isBusy}
                  aria-label="Send"
                  className="absolute bottom-1.5 right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: "#8298BC", marginTop: 6, textAlign: "center" }}>
                Verify before clinical use · Esc closes
              </p>
            </div>
          </div>
        )}

        {/* New-topic confirm — destructive copy is load-bearing */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(11,43,107,.35)" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", maxWidth: 360, margin: "0 20px", boxShadow: "0 20px 60px -10px rgba(11,43,107,.3)" }}>
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16.5, color: "#0B2B6B", margin: "0 0 8px" }}>
                Start a new topic?
              </h3>
              <p style={{ fontSize: 13.5, color: "#55698F", lineHeight: 1.55, margin: "0 0 18px" }}>
                This permanently deletes LIAM&apos;s conversation history for {clientName || "this client"} —
                including its memory of earlier discussions. LIAM will start over from their record alone.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                  style={{ border: "1px solid #DCE6F3", background: "#fff", color: "#55698F", fontWeight: 600, fontSize: 13, padding: "8px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={clearThread}
                  disabled={clearing}
                  style={{ border: "none", background: "#C0392B", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 14px", borderRadius: 9, cursor: clearing ? "default" : "pointer", opacity: clearing ? 0.6 : 1, fontFamily: "inherit" }}
                >
                  {clearing ? "Deleting…" : "Delete and start fresh"}
                </button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
