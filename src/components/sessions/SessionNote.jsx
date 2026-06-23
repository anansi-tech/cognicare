"use client";
import { useEffect, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SaveIndicator } from "@/components/ai/editable";

const FIELDS = [
  ["subjective", "Subjective"],
  ["objective", "Objective"],
  ["assessment", "Assessment"],
  ["plan", "Plan"],
];

export function SessionNote({ sessionId, refreshKey }) {
  const [note, setNote] = useState(null);
  const [soap, setSoap] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const seeded = useRef(false);

  const load = () =>
    fetch(`/api/sessions/${sessionId}/note`).then((r) => r.json()).then((n) => {
      setNote(n); setSoap(n?.payload?.soap ?? null); seeded.current = true;
    });
  useEffect(() => { seeded.current = false; load(); }, [sessionId, refreshKey]);

  const draft = note?.status === "draft";
  const editorOpen = draft || isEditing;

  // Debounced autosave while editing (draft or re-editing approved). Saves the
  // SOAP text only — never changes approval status. Mirrors the AI-report editors.
  useEffect(() => {
    if (!note || !soap || !seeded.current || !editorOpen) return;
    if (JSON.stringify(soap) === JSON.stringify(note.payload?.soap)) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/note`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ soap }),
        });
        if (res.ok) {
          const data = await res.json();
          setNote((prev) => ({ ...prev, payload: data.payload }));
          setSaveState("saved");
        } else setSaveState("idle");
      } catch { setSaveState("idle"); }
    }, 800);
    return () => clearTimeout(t);
  }, [soap, note, editorOpen, sessionId]);

  if (!note) return null;

  const approve = async () => {
    const res = await fetch(`/api/sessions/${sessionId}/note`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soap, status: "approved" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNote((prev) => ({ ...prev, payload: data.payload, status: "approved" }));
      setIsEditing(false);
      setSaveState("idle");
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Session note</CardTitle>
        <Badge variant={draft ? "secondary" : "default"}>
          {draft ? "Draft — not in record" : "Approved"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</p>
            {editorOpen ? (
              <Textarea value={soap?.[key] ?? ""} rows={3}
                onChange={(e) => setSoap((s) => ({ ...s, [key]: e.target.value }))} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{soap?.[key]}</p>
            )}
          </div>
        ))}
        <div className="flex items-center gap-3">
          {editorOpen ? (
            <>
              <SaveIndicator state={saveState} />
              <Button onClick={approve}>Approve note</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Edit note</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
