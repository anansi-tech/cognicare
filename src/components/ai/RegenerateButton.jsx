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
      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {generating ? "Regenerating…" : "Regenerate note & progress"}
    </button>
  );
}
