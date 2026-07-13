"use client";
import { useState } from "react";

export function RegenerateButton({ clientId, sessionId, onDone }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    const confirmed = window.confirm(
      "Regenerate will replace the current session note and progress report, including any edits you've approved. This can't be undone. Continue?"
    );
    if (!confirmed) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        // Generation failed server-side; the old reports were not deleted.
        setError(
          (await res.json().catch(() => null))?.error ??
            "Regeneration failed — your previous reports are unchanged."
        );
        return;
      }
      onDone?.();
    } catch {
      setError("Regeneration failed — your previous reports are unchanged.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={generating}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {generating ? "Regenerating…" : "↺ Regenerate note & progress"}
      </button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
