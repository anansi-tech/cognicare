"use client";

import { useRef, useState } from "react";
import {
  RecordEditHeader, InlineEditScope, InlineField, InlineInput, InlineText, InlineEnum,
} from "@/components/ai/editable";
import { useAutosaveRecord } from "@/components/ai/useAutosaveRecord";

// Inline per-field editor for an EXISTING session — the edit-mode replacement
// for SessionForm (which remains the creation form, including recurrence,
// which is create-only). Same pins as every inline record: every field edit
// merges into the full session body and autosaves through the existing
// PATCH /api/sessions/[id] (the same shape SessionForm submitted).
//
// Status is NEVER touched by autosave. The old form's submit rule — writing a
// note completes a scheduled/in-progress session, arming the post-session AI
// trigger; cancelled/no-show untouched — runs exactly once, quietly, on Done
// (the new intent moment, exact parity with the old Save button).

const TYPE_OPTIONS = [
  { value: "initial", label: "Initial" },
  { value: "followup", label: "Follow-up" },
  { value: "assessment", label: "Assessment" },
  { value: "crisis", label: "Crisis" },
  { value: "group", label: "Group" },
  { value: "family", label: "Family" },
];
const FORMAT_OPTIONS = [
  { value: "in-person", label: "In-person" },
  { value: "video", label: "Video" },
  { value: "phone", label: "Phone" },
  { value: "chat", label: "Chat" },
];
const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no-show", label: "No-show" },
];
// Sky status-pill scale (same vocabulary as the sessions table).
const STATUS_COLORS = {
  scheduled:     { bg: "#E2F4F2", color: "#158A98" },
  "in-progress": { bg: "#FBF2DA", color: "#A9821F" },
  completed:     { bg: "#E7F6EC", color: "#3B9E57" },
  cancelled:     { bg: "#EEF1F5", color: "#6E7E97" },
  "no-show":     { bg: "#FDECEC", color: "#C0392B" },
};
const BLUE = { bg: "#EAF3FF", color: "#2F80FF" };
const TYPE_COLORS = Object.fromEntries(TYPE_OPTIONS.map((o) => [o.value, BLUE]));
const FORMAT_COLORS = Object.fromEntries(FORMAT_OPTIONS.map((o) => [o.value, BLUE]));

const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

const Para = ({ children, muted }) => (
  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: muted ? "#8298BC" : "#41557A", margin: 0, whiteSpace: "pre-wrap" }}>
    {children}
  </p>
);
const CARD = { background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.25)", padding: "6px 20px 20px" };

function sessionBody(session, form) {
  return {
    clientId: typeof session.clientId === "object" ? session.clientId._id : session.clientId,
    date: form.date,
    duration: form.duration,
    type: form.type,
    format: form.format,
    status: form.status,
    notes: form.notes,
    concerns: session.concerns || "",
    progress: session.progress || "",
    nextSteps: session.nextSteps || "",
  };
}

export default function InlineSessionEditor({ session, onChanged, onDone }) {
  const [form, setForm] = useState(() => ({
    date: session.date,
    duration: session.duration,
    type: session.type,
    format: session.format,
    status: session.status,
    notes: session.notes || "",
  }));
  const formRef = useRef(form);
  formRef.current = form;
  const [finishing, setFinishing] = useState(false);

  const patch = async (body) => {
    const res = await fetch(`/api/sessions/${session._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!res.ok) return null;
    return res.json();
  };

  const { touch, flush, saveState, savedAt, problems, markSaved } = useAutosaveRecord({
    seed: sessionBody(session, {
      date: session.date, duration: session.duration, type: session.type,
      format: session.format, status: session.status, notes: session.notes || "",
    }),
    getBody: () => sessionBody(session, formRef.current),
    // The creation form's validation rules.
    validate: () => {
      const f = formRef.current;
      const errs = [];
      if (!f.date) errs.push("Date is required");
      if (!f.duration || Number(f.duration) <= 0) errs.push("Duration must be greater than 0");
      if (f.status === "completed" && !f.notes.trim()) errs.push("Notes are required for completed sessions");
      return errs;
    },
    save: async (body) => {
      const saved = await patch(body);
      if (!saved) return false;
      onChanged?.(saved);
      return true;
    },
  });

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); touch(); };

  // Done inherits the old Save button's semantics: flush any pending edit,
  // then apply the completion rule ONCE — quietly, exact parity with the form.
  const finish = async () => {
    setFinishing(true);
    await flush();
    const f = formRef.current;
    const promote = f.notes.trim() && (f.status === "scheduled" || f.status === "in-progress");
    if (promote) {
      const body = { ...sessionBody(session, f), status: "completed" };
      const saved = await patch(body);
      if (saved) {
        markSaved(body);
        onChanged?.(saved);
      }
    }
    setFinishing(false);
    onDone?.();
  };

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "28px 32px 64px" }}>
      <RecordEditHeader
        eyebrow="Session"
        title="Edit session"
        saveState={saveState}
        savedAt={savedAt}
        updatedAt={session.updatedAt}
        onDone={finish}
        doneLabel={finishing ? "Finishing…" : "Done"}
        problems={problems}
      />

      <InlineEditScope>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={CARD}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", columnGap: 28 }}>
              <InlineField
                id="date"
                label="Date & time"
                value={form.date}
                onChange={(v) => set("date", v)}
                read={<Para>{fmtDateTime(form.date)}</Para>}
                editor={
                  <InlineInput
                    type="datetime-local"
                    value={toLocalInput(form.date)}
                    onChange={(v) => set("date", v ? new Date(v).toISOString() : "")}
                  />
                }
              />
              <InlineField
                id="duration"
                label="Duration (minutes)"
                value={form.duration}
                onChange={(v) => set("duration", v)}
                read={<Para>{form.duration ? `${form.duration} min` : "—"}</Para>}
                editor={
                  <InlineInput
                    type="number"
                    value={String(form.duration ?? "")}
                    onChange={(v) => set("duration", v === "" ? "" : Number(v))}
                    placeholder="50"
                  />
                }
              />
              <InlineField
                id="type"
                label="Type"
                value={form.type}
                onChange={(v) => set("type", v)}
                bare
                read={
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: BLUE.bg, color: BLUE.color, textTransform: "capitalize" }}>
                    {TYPE_OPTIONS.find((o) => o.value === form.type)?.label ?? form.type}
                  </span>
                }
                editor={({ commit }) => (
                  <InlineEnum value={form.type} onChange={(v) => set("type", v)} options={TYPE_OPTIONS} colors={TYPE_COLORS} onDone={() => commit()} />
                )}
              />
              <InlineField
                id="format"
                label="Format"
                value={form.format}
                onChange={(v) => set("format", v)}
                bare
                read={
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: BLUE.bg, color: BLUE.color, textTransform: "capitalize" }}>
                    {FORMAT_OPTIONS.find((o) => o.value === form.format)?.label ?? form.format}
                  </span>
                }
                editor={({ commit }) => (
                  <InlineEnum value={form.format} onChange={(v) => set("format", v)} options={FORMAT_OPTIONS} colors={FORMAT_COLORS} onDone={() => commit()} />
                )}
              />
              <InlineField
                id="status"
                label="Status"
                value={form.status}
                onChange={(v) => set("status", v)}
                bare
                read={
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: (STATUS_COLORS[form.status] ?? STATUS_COLORS.scheduled).bg, color: (STATUS_COLORS[form.status] ?? STATUS_COLORS.scheduled).color, textTransform: "capitalize" }}>
                    {STATUS_OPTIONS.find((o) => o.value === form.status)?.label ?? form.status}
                  </span>
                }
                editor={({ commit }) => (
                  <InlineEnum value={form.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} colors={STATUS_COLORS} onDone={() => commit()} />
                )}
              />
            </div>
            <div style={{ marginTop: 4 }}>
              <InlineField
                id="notes"
                label="Session notes"
                value={form.notes}
                onChange={(v) => set("notes", v)}
                read={<Para muted={!form.notes}>{form.notes || "No notes recorded for this session."}</Para>}
                editor={<InlineText value={form.notes} onChange={(v) => set("notes", v)} rows={8} placeholder="Enter session notes, observations, and next steps..." />}
              />
              <p style={{ fontSize: 12, color: "#8298BC", margin: "8px 0 0" }}>
                Writing notes marks a scheduled session completed when you press Done.
              </p>
            </div>
          </div>
        </div>
      </InlineEditScope>
    </div>
  );
}
