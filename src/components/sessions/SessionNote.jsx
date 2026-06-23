"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const FIELDS = [
  ["subjective", "Subjective"],
  ["objective", "Objective"],
  ["assessment", "Assessment"],
  ["plan", "Plan"],
];

export function SessionNote({ sessionId, refreshKey }) {
  const [note, setNote] = useState(null);
  const [soap, setSoap] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const load = () =>
    fetch(`/api/sessions/${sessionId}/note`).then((r) => r.json()).then((n) => {
      setNote(n); setSoap(n?.payload?.soap ?? null);
    });
  useEffect(() => { load(); }, [sessionId, refreshKey]);

  if (!note) return null;
  const draft = note.status === "draft";
  const editorOpen = draft || isEditing;

  const save = async (approve) => {
    setSaving(true);
    await fetch(`/api/sessions/${sessionId}/note`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soap, status: approve ? "approved" : undefined }),
    });
    setSaving(false);
    if (approve) setIsEditing(false);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Session note</CardTitle>
        <Badge variant={draft ? "secondary" : "default"}>{draft ? "Draft — not in record" : "Approved"}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {editorOpen ? (
              <Textarea value={soap?.[key] ?? ""} rows={3}
                onChange={(e) => setSoap((s) => ({ ...s, [key]: e.target.value }))} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{soap?.[key]}</p>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          {draft && (
            <Button onClick={() => save(true)} disabled={saving}>
              {saving ? "Saving…" : "Approve note"}
            </Button>
          )}
          {!draft && isEditing && (
            <>
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button onClick={() => save(true)} disabled={saving}>
                {saving ? "Saving…" : "Approve note"}
              </Button>
            </>
          )}
          {!draft && !isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit note
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
