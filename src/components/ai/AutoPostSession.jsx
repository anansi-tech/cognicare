"use client";
import { useEffect, useState } from "react";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";
import { Button } from "@/components/ui/button";

// Post-session trigger: when a completed session has no documentation report yet,
// run the post-session workflow. Produces the progress report and the SOAP draft
// note. (Notes are guaranteed by SessionForm validation on "completed".)
export function AutoPostSession({ clientId, sessionId, sessionStatus, onDone, onGeneratingChange }) {
  const eligible = sessionStatus === "completed" && !!clientId && !!sessionId;
  const [loaded, setLoaded] = useState(false);
  const [hasDocumentation, setHasDocumentation] = useState(false);

  useEffect(() => {
    if (!eligible) {
      setLoaded(false);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/clients/${clientId}/ai-reports?agentType=documentation&sessionId=${sessionId}&limit=1`,
    )
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((data) => {
        if (cancelled) return;
        setHasDocumentation((data.reports?.length ?? 0) > 0);
        setLoaded(true);
      })
      .catch(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [eligible, clientId, sessionId]);

  const { generating, error, retry } = useEnsureWorkflow({
    shouldRun: eligible && loaded && !hasDocumentation,
    type: "post-session",
    clientId,
    sessionId,
    onDone,
  });

  // Optional (stable) observer: lets the parent hand off transient feedback
  // (the "marked completed" banner) once this panel's own state is visible.
  useEffect(() => {
    onGeneratingChange?.(generating);
  }, [generating, onGeneratingChange]);

  if (!generating && !error) return null;
  if (error)
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Couldn't generate the note: {error}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  return <GeneratingState label="Writing the session note…" />;
}
