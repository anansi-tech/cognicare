"use client";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MeasureResult } from "./MeasureResult";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftRestoredNotice, DraftSaveIndicator } from "@/components/ui/DraftRestoredNotice";

/** Display condition mirror of lib/mbc/score.isItemVisible (client-side). */
function isVisible(item, responses) {
  if (!item.showIf) return true;
  return (responses[item.showIf.itemId] ?? 0) >= item.showIf.gte;
}

/** Drop answers to items whose display condition is no longer met. */
function pruneHidden(inst, responses) {
  let next = responses;
  // Iterate until stable: hiding one item can un-meet another's condition.
  for (;;) {
    const orphans = inst.items.filter((it) => next[it.id] !== undefined && !isVisible(it, next));
    if (orphans.length === 0) return next;
    next = { ...next };
    for (const it of orphans) delete next[it.id];
  }
}

export function MeasureForm({ clientId, instrumentId, sessionId, onSaved }) {
  const [inst, setInst] = useState(null);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { draftRestored, dismissRestored, clearDraft, saveState } = useFormDraft(
    `measure-draft-${clientId}-${instrumentId}-${sessionId ?? "none"}`,
    responses,
    setResponses
  );

  useEffect(() => {
    fetch(`/api/instruments/${instrumentId}`).then((r) => r.json()).then(setInst);
  }, [instrumentId]);

  if (!inst) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (result) return <MeasureResult instrument={inst} result={result} />;

  const visibleItems = inst.items.filter((it) => isVisible(it, responses));
  const answered = visibleItems.every((it) => responses[it.id] !== undefined);
  const yesNo = inst.responseStyle === "yesNo";

  const setValue = (itemId, value) =>
    setResponses((r) => pruneHidden(inst, { ...r, [itemId]: value }));

  const submit = async () => {
    setSubmitting(true); setError("");
    const payload = {
      instrumentId,
      sessionId,
      // Visible items only — a hidden item's answer was pruned when its
      // condition un-met, so nothing orphaned reaches the server.
      responses: visibleItems.map((it) => ({ itemId: it.id, value: responses[it.id] })),
    };
    const res = await fetch(`/api/clients/${clientId}/measures`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed to save"); return; }
    const saved = await res.json();
    clearDraft();
    setResult(saved);
    onSaved?.(saved);
  };

  return (
    <div className="space-y-4">
      {draftRestored && (
        <DraftRestoredNotice
          onDismiss={dismissRestored}
          onDiscard={() => { clearDraft({}); setResponses({}); }}
        />
      )}
      <p className="text-sm text-muted-foreground">{inst.stem}</p>
      {visibleItems.map((it, i) => (
        <div key={it.id} className="space-y-2 border-b pb-3">
          {it.instruction && (
            <p style={{ fontSize: 12, fontWeight: 600, color: "#8298BC", fontStyle: "italic", margin: 0 }}>
              {it.instruction}
            </p>
          )}
          <Label className="text-sm">
            {it.num ?? i + 1}. {it.text}
            {it.timeFrame && (
              <span style={{ fontWeight: 500, color: "#8298BC", marginLeft: 6, fontSize: 12 }}>({it.timeFrame})</span>
            )}
          </Label>
          {it.detail && (
            <p style={{ fontSize: 12, color: "#8298BC", lineHeight: 1.5, margin: 0 }}>{it.detail}</p>
          )}
          {yesNo ? (
            <div className="flex gap-2">
              {inst.responseOptions.map((opt) => {
                const selected = responses[it.id] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue(it.id, opt.value)}
                    style={{
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "7px 22px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: selected ? "1px solid #2F80FF" : "1px solid #DCE6F3",
                      background: selected ? "#EAF3FF" : "#fff",
                      color: selected ? "#2F80FF" : "#55698F",
                      transition: "background .13s, border-color .13s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <RadioGroup
              className="flex flex-wrap gap-3"
              value={responses[it.id]?.toString() ?? ""}
              onValueChange={(v) => setValue(it.id, Number(v))}
            >
              {inst.responseOptions.map((opt) => (
                <div key={opt.value} className="flex items-center gap-1.5">
                  <RadioGroupItem value={opt.value.toString()} id={`${it.id}-${opt.value}`} />
                  <Label htmlFor={`${it.id}-${opt.value}`} className="text-xs font-normal">{opt.label}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>
      ))}
      {inst.attribution && (
        <p style={{ fontSize: 11, color: "#A6B8D4", margin: 0 }}>{inst.attribution}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DraftSaveIndicator state={saveState} />
      <Button onClick={submit} disabled={!answered || submitting}>
        {submitting ? "Scoring…" : "Submit"}
      </Button>
    </div>
  );
}
