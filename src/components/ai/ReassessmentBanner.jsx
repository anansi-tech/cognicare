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
    <div style={{ marginBottom: 16, background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 14, padding: "14px 16px" }}>
      <p style={{ fontWeight: 700, fontSize: 14, color: "#A9821F", margin: 0 }}>Reassessment recommended</p>
      {data.rationale && <p style={{ fontSize: 13.5, color: "#7A6020", marginTop: 4 }}>{data.rationale}</p>}
      <p style={{ fontSize: 13.5, color: "#7A6020", marginTop: 4 }}>
        Re-administer the client&apos;s measures (PHQ-9 / GAD-7) so progress and the treatment
        plan can be re-evaluated before the next session.
      </p>
      <button
        type="button"
        onClick={() => router.push(`/clients/${clientId}?tab=progress`)}
        style={{ marginTop: 10, display: "inline-flex", alignItems: "center", borderRadius: 9, background: "#A9821F", color: "#fff", padding: "6px 14px", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
        className="hover:opacity-90 transition-opacity"
      >
        Administer measures
      </button>
    </div>
  );
}
