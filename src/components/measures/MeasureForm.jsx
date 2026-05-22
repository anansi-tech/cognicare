"use client";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MeasureResult } from "./MeasureResult";

export function MeasureForm({ clientId, instrumentId, sessionId, onSaved }) {
  const [inst, setInst] = useState(null);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/instruments/${instrumentId}`).then((r) => r.json()).then(setInst);
  }, [instrumentId]);

  if (!inst) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (result) return <MeasureResult instrument={inst} result={result} />;

  const answered = inst.items.every((it) => responses[it.id] !== undefined);

  const submit = async () => {
    setSubmitting(true); setError("");
    const payload = {
      instrumentId,
      sessionId,
      responses: inst.items.map((it) => ({ itemId: it.id, value: responses[it.id] })),
    };
    const res = await fetch(`/api/clients/${clientId}/measures`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed to save"); return; }
    const saved = await res.json();
    setResult(saved);
    onSaved?.(saved);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{inst.stem}</p>
      {inst.items.map((it, i) => (
        <div key={it.id} className="space-y-2 border-b pb-3">
          <Label className="text-sm">{i + 1}. {it.text}</Label>
          <RadioGroup
            className="flex flex-wrap gap-3"
            value={responses[it.id]?.toString() ?? ""}
            onValueChange={(v) => setResponses((r) => ({ ...r, [it.id]: Number(v) }))}
          >
            {inst.responseOptions.map((opt) => (
              <div key={opt.value} className="flex items-center gap-1.5">
                <RadioGroupItem value={opt.value.toString()} id={`${it.id}-${opt.value}`} />
                <Label htmlFor={`${it.id}-${opt.value}`} className="text-xs font-normal">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={submit} disabled={!answered || submitting}>
        {submitting ? "Scoring…" : "Submit"}
      </Button>
    </div>
  );
}
