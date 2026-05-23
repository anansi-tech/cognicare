"use client";
import { useEffect, useState } from "react";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";
import { Button } from "@/components/ui/button";

// Pre-session trigger: when a scheduled session has no treatment report on it yet,
// run the pre-session workflow. Quietly — don't block the rest of the page.
export function AutoSessionPrep({ clientId, sessionId, sessionStatus, onDone }) {
  const eligible = sessionStatus === "scheduled" && !!clientId && !!sessionId;
  const [loaded, setLoaded] = useState(false);
  const [hasTreatment, setHasTreatment] = useState(false);

  useEffect(() => {
    if (!eligible) {
      setLoaded(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/clients/${clientId}/ai-reports?agentType=treatment&sessionId=${sessionId}&limit=1`)
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((data) => {
        if (cancelled) return;
        setHasTreatment((data.reports?.length ?? 0) > 0);
        setLoaded(true);
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [eligible, clientId, sessionId]);

  const { generating, error, retry } = useEnsureWorkflow({
    shouldRun: eligible && loaded && !hasTreatment,
    type: "pre-session",
    clientId,
    sessionId,
    onDone,
  });

  if (!generating && !error) return null;
  if (error)
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Couldn't prepare the session: {error}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  return <GeneratingState label="Preparing your session…" />;
}
