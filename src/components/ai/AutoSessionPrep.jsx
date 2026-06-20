"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export function AutoSessionPrep({ clientId, sessionId, sessionStatus, onDone }) {
  const eligible = sessionStatus === "scheduled" && !!clientId && !!sessionId;
  const [hasTreatment, setHasTreatment] = useState(null); // null = not yet checked
  const [hasPriorActivity, setHasPriorActivity] = useState(null); // completed session since intake?
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eligible) { setHasTreatment(null); setHasPriorActivity(null); return; }
    let cancelled = false;
    Promise.all([
      fetch(`/api/clients/${clientId}/ai-reports?agentType=treatment&sessionId=${sessionId}&limit=1`)
        .then((r) => (r.ok ? r.json() : { reports: [] })),
      // "New to work with" = at least one completed session. On the first followup
      // after intake there are none, so the plan can't be meaningfully revised yet.
      fetch(`/api/sessions?clientId=${clientId}`)
        .then((r) => (r.ok ? r.json() : { sessions: [] })),
    ])
      .then(([treatmentData, sessionData]) => {
        if (cancelled) return;
        setHasTreatment((treatmentData.reports?.length ?? 0) > 0);
        const sessions = sessionData.sessions ?? sessionData ?? [];
        setHasPriorActivity(sessions.some((s) => s.status === "completed"));
      })
      .catch(() => { if (!cancelled) { setHasTreatment(false); setHasPriorActivity(false); } });
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

  // Hide when: not a scheduled session, still loading, treatment already prepped for this
  // session, or there's nothing new to revise from yet (no completed session since intake).
  if (!eligible || hasTreatment === null || hasPriorActivity === null) return null;
  if (hasTreatment || !hasPriorActivity) return null;

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
