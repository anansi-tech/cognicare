"use client";
import { useEffect, useState } from "react";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";

// Post-session trigger: when a completed + documented session has no documentation
// report yet, run the post-session workflow. Produces the progress report and the
// SOAP draft note.
export function AutoPostSession({ clientId, sessionId, sessionStatus, documented, onDone }) {
  const eligible = sessionStatus === "completed" && !!documented && !!clientId && !!sessionId;
  const [loaded, setLoaded] = useState(false);
  const [hasDocumentation, setHasDocumentation] = useState(false);

  useEffect(() => {
    if (!eligible) { setLoaded(false); return; }
    let cancelled = false;
    fetch(`/api/clients/${clientId}/ai-reports?agentType=documentation&sessionId=${sessionId}&limit=1`)
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((data) => {
        if (cancelled) return;
        setHasDocumentation((data.reports?.length ?? 0) > 0);
        setLoaded(true);
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => { cancelled = true; };
  }, [eligible, clientId, sessionId]);

  const { generating, error } = useEnsureWorkflow({
    shouldRun: eligible && loaded && !hasDocumentation,
    type: "post-session",
    clientId,
    sessionId,
    onDone,
  });

  if (!generating && !error) return null;
  if (error) return <p className="text-sm text-destructive">Note generation failed: {error}</p>;
  return <GeneratingState label="Writing the session note…" />;
}
