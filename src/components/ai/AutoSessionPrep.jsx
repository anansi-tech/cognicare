"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export function AutoSessionPrep({ clientId, sessionId, sessionStatus, onDone }) {
  const eligible = sessionStatus === "scheduled" && !!clientId && !!sessionId;
  const [hasTreatment, setHasTreatment] = useState(null); // null = not yet checked
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eligible) { setHasTreatment(null); return; }
    let cancelled = false;
    fetch(`/api/clients/${clientId}/ai-reports?agentType=treatment&sessionId=${sessionId}&limit=1`)
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((data) => { if (!cancelled) setHasTreatment((data.reports?.length ?? 0) > 0); })
      .catch(() => { if (!cancelled) setHasTreatment(false); });
    return () => { cancelled = true; };
  }, [eligible, clientId, sessionId]);

  const run = useCallback(() => {
    setGenerating(true);
    setError("");
    fetch("/api/ai/agent-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pre-session", clientId, sessionId }),
    })
      .then((r) => { if (!r.ok) throw new Error("Workflow failed"); return r.json(); })
      .then(() => { setHasTreatment(true); onDone?.(); })
      .catch((e) => setError(e.message || "Workflow failed"))
      .finally(() => setGenerating(false));
  }, [clientId, sessionId, onDone]);

  // Not a scheduled session, or treatment already exists — render nothing
  if (!eligible || hasTreatment === null || hasTreatment) return null;

  return (
    <div className="rounded-md border border-border bg-muted/40 px-4 py-3 space-y-2">
      <p className="text-sm text-muted-foreground">
        Prepare for this session — generates an updated treatment plan based on the latest progress.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="sm" onClick={run} disabled={generating}>
        {generating ? "Preparing your session…" : "Prepare session"}
      </Button>
    </div>
  );
}
