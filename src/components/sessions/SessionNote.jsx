"use client";
import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SaveIndicator, IconButton, PencilIcon } from "@/components/ai/editable";
import { FileText } from "lucide-react";

const FIELDS = [
  ["subjective", "Subjective"],
  ["objective", "Objective"],
  ["assessment", "Assessment"],
  ["plan", "Plan"],
];

// `id`: scroll-spy anchor. `nudge`: caller-owned strip (the notes-staleness
// regenerate offer) rendered between the sticky header and the body — its
// render condition and wiring live in SessionDetail; only placement is here.
export function SessionNote({ sessionId, refreshKey, id, nudge }) {
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

  // The debounce must not make the final keystrokes disposable: if the page
  // unloads (or the tab hides, or the component unmounts) inside the 800ms
  // window, flush the pending edit immediately. keepalive lets the request
  // outlive the page. Safe to race with the debounced save — the route's
  // canonical-hash gate makes an identical second PATCH a no-op.
  const soapRef = useRef(soap);
  const noteRef = useRef(note);
  const editorOpenRef = useRef(editorOpen);
  soapRef.current = soap;
  noteRef.current = note;
  editorOpenRef.current = editorOpen;

  useEffect(() => {
    const flush = () => {
      const s = soapRef.current;
      const n = noteRef.current;
      if (!n || !s || !editorOpenRef.current) return;
      if (JSON.stringify(s) === JSON.stringify(n.payload?.soap)) return;
      fetch(`/api/sessions/${sessionId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soap: s }),
        keepalive: true,
      }).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush(); // unmount flush
    };
  }, [sessionId]);

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

  // Document-mode section (Overview v2 vocabulary): sticky header carries the
  // actions that used to sit at the bottom — same handlers, same states.
  return (
    <section id={id} style={{ background: "#fff", border: `1px solid ${editorOpen ? "#F0DFAE" : "#E3ECF7"}`, borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.25)" }}>
      {/* Sticky header — sits below the app navbar */}
      <div style={{ position: "sticky", top: 64, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", background: "rgba(255,255,255,.94)", backdropFilter: "blur(6px)", borderBottom: "1px solid #EEF3FA", borderRadius: "20px 20px 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, background: "#EAF3FF", color: "#2F80FF", flexShrink: 0 }}>
            <FileText size={16} />
          </span>
          <div>
            <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, margin: 0, color: "#0B2B6B" }}>Session note</h3>
            <p style={{ fontSize: 11.5, color: "#8298BC", margin: "1px 0 0" }}>SOAP · This session</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: statusPill.bg, color: statusPill.color }}>
            {statusPill.label}
          </span>
          {editorOpen ? (
            <>
              <SaveIndicator state={saveState} />
              <button
                onClick={approve}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "7px 13px", borderRadius: 9, boxShadow: "0 10px 24px -12px rgba(47,128,255,.7)" }}
              >
                Approve note
              </button>
            </>
          ) : (
            <IconButton title="Edit note" onClick={() => setIsEditing(true)}>
              <PencilIcon />
            </IconButton>
          )}
        </div>
      </div>

      {nudge}

      {/* Body */}
      <div style={{ padding: "4px 20px 20px" }}>
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
      </div>
    </section>
  );
}
