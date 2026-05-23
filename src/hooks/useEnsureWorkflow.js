"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Fires a workflow once when `shouldRun` is true and its output is missing.
// Returns `retry` to re-run after a failure (bypasses the once-guard).
export function useEnsureWorkflow({ shouldRun, type, clientId, sessionId, onDone }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const fired = useRef(false);

  const run = useCallback(() => {
    fired.current = true;
    setGenerating(true);
    setError("");
    fetch("/api/ai/agent-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, clientId, sessionId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Workflow failed");
        return r.json();
      })
      .then(() => onDone?.())
      .catch((e) => setError(e.message || "Workflow failed"))
      .finally(() => setGenerating(false));
  }, [type, clientId, sessionId, onDone]);

  useEffect(() => {
    if (!shouldRun || fired.current) return;
    run();
  }, [shouldRun, run]);

  const retry = useCallback(() => run(), [run]); // explicit re-run, ignores the once-guard

  return { generating, error, retry };
}
