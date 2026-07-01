"use client";

import { useState } from "react";

// One neutral container used by ClientInsights and SessionAIInsights when they
// render stacked agent outputs. Heading, optional summary in a muted box, then
// children (the AgentReportBody dispatched payload).
//
// Round 20: optionally collapsible. When `collapsible` is set the header shows
// a toggle and the detailed body hides — the summary stays visible (it's the
// scannable takeaway). Backward-compatible: existing callers without the prop
// keep the original always-expanded behaviour.
export function Section({
  title,
  summary,
  children,
  collapsible = false,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Don't collapse to a blank card — if there's no summary (agent hasn't run
  // yet), show the children regardless so the Empty hint is visible.
  const showBody = !collapsible || open || !summary;

  return (
    <section style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.25)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 12px" }}>
        <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: 0 }}>{title}</h3>
        {collapsible && summary && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer" }}
            className="hover:text-primary/70 transition-colors"
          >
            {open ? "Hide details" : "Show details"}
            <span
              aria-hidden
              style={{ display: "inline-block", transition: "transform 150ms", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▾
            </span>
          </button>
        )}
      </div>
      <div style={{ padding: "0 20px 18px" }}>
        {summary && (
          <p style={{ marginBottom: 14, background: "#F2F7FD", borderRadius: 10, padding: "10px 14px", fontSize: 13.5, color: "#0B2B6B", lineHeight: 1.6, opacity: 0.85 }}>
            {summary}
          </p>
        )}
        {showBody && children}
      </div>
    </section>
  );
}

export function Empty({ children }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
