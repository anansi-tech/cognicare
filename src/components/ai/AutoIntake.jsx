"use client";
import { useEffect, useState } from "react";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";

// Fires intake (assessment -> diagnostic) the first time a client is viewed
// without an assessment report. Calls onDone after the workflow completes so
// the page can refetch its data.
export function AutoIntake({ clientId, onDone }) {
  const [loaded, setLoaded] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/ai-reports?agentType=assessment&limit=1`)
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((data) => {
        if (cancelled) return;
        setHasAssessment((data.reports?.length ?? 0) > 0);
        setLoaded(true);
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => { cancelled = true; };
  }, [clientId]);

  const { generating, error } = useEnsureWorkflow({
    shouldRun: loaded && !hasAssessment,
    type: "intake",
    clientId,
    onDone,
  });

  if (!generating && !error) return null;
  if (error) return <p className="text-sm text-destructive">Intake failed: {error}</p>;
  return <GeneratingState label="Analyzing intake — building assessment and diagnosis…" />;
}
