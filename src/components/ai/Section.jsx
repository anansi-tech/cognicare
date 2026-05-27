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
    <section className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {collapsible && summary && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            {open ? "Hide details" : "Show details"}
            <span
              aria-hidden
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            >
              ▾
            </span>
          </button>
        )}
      </div>
      <div className="px-5 pb-5">
        {summary && (
          <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-foreground/80 leading-relaxed">
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
