# Round 20 — Collapsible agent sections (accordion) on the client Overview

> Branch `dev`, working dir `products/cognicare`. The Overview stacks four fully-expanded agent cards
> (Assessment/Diagnostic/Treatment/Progress), each ~7 fields — a long, hard-to-scan page. Make each a
> collapsible accordion card showing its summary, details behind a toggle, **Assessment open by
> default**. Touches `Section.jsx` (add collapse) + the two consumers. No sub-tabs.

## 1. Make `Section` collapsible (backward-compatible)

`src/components/ai/Section.jsx` — add a `collapsible` + `defaultOpen` prop. When `collapsible`, the
header is a button that toggles the body; the **summary stays visible even when collapsed** (it's the
scannable takeaway), only the `children` (the detailed `AgentReportBody`) collapse.

```jsx
"use client";
import { useState } from "react";

export function Section({ title, summary, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {collapsible && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            {open ? "Hide details" : "Show details"}
            <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
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
```
Default `collapsible=false` keeps existing callers (SessionAIInsights) unchanged unless they opt in.

> If there's no summary (agent hasn't run / empty), the collapsed card should still show the `Empty`
> children or a hint — don't collapse to an empty card. Simplest: when `!summary`, render children
> regardless (the Empty message), or keep that section open. Handle so a not-yet-generated agent
> isn't a blank collapsed bar.

## 2. ClientInsights — opt into accordion, Assessment open

`src/app/components/clients/ClientInsights.js` — pass `collapsible` to all four, `defaultOpen` only
for Assessment:
```jsx
<Section title="Assessment" summary={assessment?.summary} collapsible defaultOpen>
  {assessment ? <AgentReportBody agentType="assessment" payload={assessment.payload} />
              : <Empty>Assessment generates automatically when a client is created.</Empty>}
</Section>
<Section title="Diagnostic Impression" summary={diagnostic?.summary} collapsible defaultOpen={false}>
  {diagnostic ? <AgentReportBody agentType="diagnostic" payload={diagnostic.payload} />
              : <Empty>Generated automatically after the assessment.</Empty>}
</Section>
<Section title="Treatment Plan" summary={treatment?.summary} collapsible defaultOpen={false}>
  {treatment ? <AgentReportBody agentType="treatment" payload={treatment.payload} />
             : <Empty>Generated automatically when you open a scheduled session.</Empty>}
</Section>
<Section title="Progress Report" summary={progress?.summary} collapsible defaultOpen={false}>
  {progress ? <AgentReportBody agentType="progress" payload={progress.payload} />
            : <Empty>Generated automatically after you complete a session.</Empty>}
</Section>
```

## 3. SessionAIInsights — your call (recommend same)

`SessionAIInsights` uses the same four `Section`s. For consistency, apply the same `collapsible`
treatment (Assessment open, rest collapsed). If you'd rather leave the session page fully expanded,
just don't pass `collapsible` there — it stays as-is (default false). **Recommend: make it collapsible
too** so both surfaces behave the same. (Low risk — same component.)

## Acceptance criteria

1. Client Overview: four agent cards, each showing its summary; **Assessment expanded**, the other
   three collapsed to summary + a "Show details" toggle. Clicking toggles the detailed body.
2. A not-yet-generated agent shows its Empty hint, not a blank collapsed bar.
3. SessionAIInsights behaves consistently (if you opt it in).
4. No sub-tabs; clean vertical scannable stack. `npm run lint` clean; `npm run build` succeeds.

## Commit
```
feat(cognicare): collapsible agent sections on Overview (accordion; Assessment open by default)
```
