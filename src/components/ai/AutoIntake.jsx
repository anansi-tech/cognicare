"use client";
import { useEffect, useState } from "react";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";
import { Button } from "@/components/ui/button";

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
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const { generating, error, retry } = useEnsureWorkflow({
    shouldRun: loaded && !hasAssessment,
    type: "intake",
    clientId,
    onDone,
  });

  if (!generating && !error) return null;
  if (error)
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Couldn't generate the assessment: {error}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  return <GeneratingState label="Analyzing intake — building assessment, diagnosis, and initial treatment plan…" />;
}
