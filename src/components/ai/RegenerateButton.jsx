"use client";
import { useState } from "react";

export function RegenerateButton({ clientId, sessionId, onDone }) {
  const [generating, setGenerating] = useState(false);

  const handleClick = async () => {
    const confirmed = window.confirm(
      "Regenerate will replace the current session note and progress report, including any edits you've approved. This can't be undone. Continue?"
    );
    if (!confirmed) return;

    setGenerating(true);
    try {
      await fetch(`/api/clients/${clientId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      onDone?.();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={generating}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {generating ? "Regenerating…" : "↺ Regenerate note & progress"}
    </button>
  );
}
