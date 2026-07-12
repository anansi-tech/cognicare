"use client";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
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
  const [saveState, setSaveState] = useState("idle");
  const seeded = useRef(false);

  const load = () =>
    fetch(`/api/sessions/${sessionId}/note`).then((r) => r.json()).then((n) => {
      setNote(n); setSoap(n?.payload?.soap ?? null); seeded.current = true;
    });
  useEffect(() => { seeded.current = false; load(); }, [sessionId, refreshKey]);

  const draft = note?.status === "draft";
  const editorOpen = draft || isEditing;

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
        } else setSaveState("error");
      } catch { setSaveState("error"); }
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

  const statusPill = draft
    ? { bg: "#EEF1F5", color: "#6E7E97", label: "Draft — not in record" }
    : { bg: "#E7F6EC", color: "#3B9E57", label: "Approved" };

  return (
    <div style={{ border: "1px solid #E7EEF7", borderRadius: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: "linear-gradient(90deg, #F6FAFF, #FFFFFF)", borderBottom: "1px solid #EEF3FA" }}>
        <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 15, margin: 0, color: "#0B2B6B" }}>Session note</h3>
        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 11px", borderRadius: 999, background: statusPill.bg, color: statusPill.color }}>
          {statusPill.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "6px 18px 18px" }}>
        {FIELDS.map(([key, label]) => (
          <div key={key} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#7C93B8" }}>{label}</div>
            {editorOpen ? (
              <Textarea
                value={soap?.[key] ?? ""}
                rows={3}
                className="mt-1 focus:ring-2 focus:ring-ring border-input"
                onChange={(e) => setSoap((s) => ({ ...s, [key]: e.target.value }))}
              />
            ) : (
              <p style={{ fontSize: 13.5, lineHeight: 1.62, color: "#41557A", margin: "7px 0 0", whiteSpace: "pre-wrap" }}>{soap?.[key]}</p>
            )}
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
          {editorOpen ? (
            <>
              <SaveIndicator state={saveState} />
              <button
                onClick={approve}
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "9px 18px", borderRadius: 10, boxShadow: "0 8px 20px -8px rgba(47,128,255,.7)" }}
              >
                Approve note
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{ border: "1px solid #DCE6F3", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#0B2B6B", fontWeight: 600, fontSize: 13.5, padding: "9px 16px", borderRadius: 10 }}
            >
              Edit note
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
