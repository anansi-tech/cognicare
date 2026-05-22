"use client";
import { useEffect, useRef, useState } from "react";

// Fires a workflow exactly once when `shouldRun` is true and its output is missing.
// `shouldRun` is computed by the caller (e.g. "client has no assessment report yet").
export function useEnsureWorkflow({ shouldRun, type, clientId, sessionId, onDone }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const fired = useRef(false);

  useEffect(() => {
    if (!shouldRun || fired.current) return;
    fired.current = true;
    setGenerating(true);
    fetch("/api/ai/agent-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, clientId, sessionId }),
    })
      .then((r) => { if (!r.ok) throw new Error("Workflow failed"); return r.json(); })
      .then(() => onDone?.())
      .catch((e) => setError(e.message))
      .finally(() => setGenerating(false));
  }, [shouldRun, type, clientId, sessionId, onDone]);

  return { generating, error };
}
