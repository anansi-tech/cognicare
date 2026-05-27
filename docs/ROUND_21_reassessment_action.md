# Round 21 — Make the reassessment banner actionable

> Branch `dev`, working dir `products/cognicare`. Today the banner says "A reassessment is recommended
> before the next session." and stops there — no why, no how, no link. Turn it into: the **rationale**
> (why), a one-line **what a reassessment is**, and a direct **action** (administer measures → the
> Progress tab). Touches only `ReassessmentBanner.jsx`. The deep-link already works (`ClientDetail`
> reads `?tab=progress`).

## What it means (context for the copy)
The progress agent sets `reassessmentRecommended` when "scores stall, worsen, or a risk flag appears."
So the banner = the latest progress evaluation thinks the client's trajectory warrants a fresh look:
re-administer PHQ-9/GAD-7 and let the plan be re-evaluated. The status route already returns a
`rationale` (the progress agent's top recommendation) — surface it.

## Changes — `src/components/ai/ReassessmentBanner.jsx`

- Capture the `rationale` from the response (already returned alongside `reassessmentRecommended`).
- Render: heading line + rationale + a short "what to do" + an action button.
- The action routes to the Progress tab where measures are administered: push
  `?tab=progress` (use `next/navigation` `useRouter`, or a plain link
  `href={\`/clients/${clientId}?tab=progress\`}`). That tab has `MeasuresPanel` (administer
  PHQ-9/GAD-7) + the trend charts — the concrete first step of a reassessment.

```jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function ReassessmentBanner({ clientId }) {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/reassessment-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setData(d?.reassessmentRecommended ? d : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientId]);

  if (!data) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
      <p className="font-medium">Reassessment recommended</p>
      {data.rationale && <p className="mt-1 text-sm">{data.rationale}</p>}
      <p className="mt-1 text-sm text-amber-800/90">
        Re-administer the client's measures (PHQ-9 / GAD-7) so progress and the treatment plan can be
        re-evaluated before the next session.
      </p>
      <button
        type="button"
        onClick={() => router.push(`/clients/${clientId}?tab=progress`)}
        className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
      >
        Administer measures
      </button>
    </div>
  );
}
```

> Keep it calm (amber, not red — it's a nudge, not an alarm). If `?tab=progress` doesn't auto-scroll
> to the measure form, that's acceptable — landing on the Progress tab is enough; the administer
> control is right there. (Optional nicety: also accept `?tab=progress#measures` and add `id="measures"`
> to the MeasuresPanel wrapper for a scroll target — only if trivial.)

## Acceptance criteria
1. When flagged, the banner shows: "Reassessment recommended", the agent's rationale, a one-line
   explanation of what to do, and an "Administer measures" button.
2. The button navigates to the client's Progress tab (measure administration + trends).
3. Still amber/calm; still only shows when genuinely flagged (unchanged trigger).
4. `npm run lint` clean; `npm run build` succeeds.

## Commit
```
feat(cognicare): actionable reassessment banner — rationale + "administer measures" action
```
