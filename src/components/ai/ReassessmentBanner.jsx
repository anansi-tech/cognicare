"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Actionable reassessment nudge (Round 21). When the progress agent flags
// reassessmentRecommended (scores stall, worsen, or a risk indicator appears),
// surface the agent's rationale + the concrete first step: administer measures.
// Stays calm amber — a nudge, not an alarm.
export function ReassessmentBanner({ clientId }) {
  const router = useRouter();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/reassessment-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d?.reassessmentRecommended ? d : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!data) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
      <p className="font-medium">Reassessment recommended</p>
      {data.rationale && <p className="mt-1 text-sm">{data.rationale}</p>}
      <p className="mt-1 text-sm text-amber-800/90">
        Re-administer the client&apos;s measures (PHQ-9 / GAD-7) so progress and the treatment
        plan can be re-evaluated before the next session.
      </p>
      <button
        type="button"
        onClick={() => router.push(`/clients/${clientId}?tab=progress`)}
        className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Administer measures
      </button>
    </div>
  );
}
