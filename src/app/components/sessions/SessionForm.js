"use client";

import { useState, useEffect, useMemo, useCallback, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftRestoredNotice, DraftSaveIndicator } from "@/components/ui/DraftRestoredNotice";
import { InlineEnum } from "@/components/ai/editable";
import {
  SESSION_TYPE_OPTIONS, SESSION_FORMAT_OPTIONS, SESSION_STATUS_OPTIONS,
  SESSION_TYPE_COLORS, SESSION_FORMAT_COLORS, SESSION_STATUS_COLORS,
} from "./InlineSessionEditor";

// CREATION form only (Sky document vocabulary): one atomic POST on Create,
// validation on submit, localStorage drafts — no autosave to the server.
// Editing an existing session lives in InlineSessionEditor.

function emptySession(initialClientId, initialDate) {
  return {
    clientId: initialClientId || "",
    date: initialDate || new Date().toISOString(),
    duration: 50,
    type: "initial",
    format: "in-person",
    status: "scheduled",
    notes: "",
    concerns: "",
    progress: "",
    nextSteps: "",
  };
}

// Sky document vocabulary (matches InlineSessionEditor / Overview sections)
const CARD = { background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.25)", padding: "6px 20px 20px" };
const H = ({ children }) => (
  <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: "18px 0 2px" }}>{children}</h3>
);
const LABEL = { display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "#7C93B8", margin: "16px 0 7px" };
const REQUIRED = <span style={{ color: "#C0392B" }}> *</span>;
const fieldStyle = (invalid) => ({
  width: "100%", border: `1px solid ${invalid ? "#E4A9A2" : "#D9E5F4"}`, borderRadius: 10,
  padding: "9px 12px", fontSize: 13.5, lineHeight: 1.6, color: "#24344F", fontFamily: "inherit",
  outline: "none", background: "#fff", boxSizing: "border-box",
});
const focusRing = (e) => (e.target.style.boxShadow = "inset 0 0 0 2px #2F80FF");
const blurRing = (e) => (e.target.style.boxShadow = "none");
const Err = ({ children }) =>
  children ? <p style={{ fontSize: 12.5, color: "#C0392B", margin: "6px 0 0" }}>{children}</p> : null;
const HINT = { fontSize: 12, color: "#8298BC", margin: "2px 0 0" };

// Sky-styled input for react-datepicker (behavior untouched — the picker's
// own open/close handlers are merged, not overridden).
const DateInput = forwardRef(function DateInput({ invalid, onFocus, onBlur, ...props }, ref) {
  return (
    <input
      ref={ref}
      {...props}
      style={fieldStyle(invalid)}
      onFocus={(e) => { onFocus?.(e); focusRing(e); }}
      onBlur={(e) => { onBlur?.(e); blurRing(e); }}
    />
  );
});

export default function SessionForm({ onSuccess, onCancel, initialClientId, initialDate }) {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [formData, setFormData] = useState(() => emptySession(initialClientId, initialDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  // Recurrence (Round 15) — create-only by nature.
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("none");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState(8);

  const draftValue = useMemo(() => ({
    formData,
    recurrenceFrequency,
    recurrenceOccurrences,
  }), [formData, recurrenceFrequency, recurrenceOccurrences]);
  const applyDraft = useCallback((updater) => {
    const next = typeof updater === "function"
      ? updater({ formData: {}, recurrenceFrequency: "none", recurrenceOccurrences: 8 })
      : updater;
    if (next.formData) setFormData((prev) => ({ ...prev, ...next.formData }));
    if (next.recurrenceFrequency !== undefined) setRecurrenceFrequency(next.recurrenceFrequency);
    if (next.recurrenceOccurrences !== undefined) setRecurrenceOccurrences(next.recurrenceOccurrences);
  }, []);
  const { draftRestored, dismissRestored, clearDraft, saveState } = useFormDraft(
    "session-draft-new",
    draftValue,
    applyDraft,
    true,
    {}
  );

  // Fetch all clients for the dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch("/api/clients");
        if (!response.ok) throw new Error("Failed to fetch clients");
        const data = await response.json();
        setClients(data);
      } catch (err) {
        console.error("Error fetching clients:", err);
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  const set = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.clientId) errors.clientId = "Client is required";
    if (!formData.date) errors.date = "Date is required";
    if (!formData.duration) errors.duration = "Duration is required";
    if (formData.duration <= 0) errors.duration = "Duration must be greater than 0";
    if (!formData.type) errors.type = "Session type is required";
    if (!formData.format) errors.format = "Session format is required";

    // Only require notes for completed sessions
    if (formData.status === "completed" && !formData.notes.trim()) {
      errors.notes = "Notes are required for completed sessions";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    // Writing a note is the act of completing a session — if the user typed
    // notes without explicitly marking it completed, treat it as such so the
    // post-session AI trigger fires. Cancelled / no-show are left alone.
    const promoteToCompleted =
      formData.notes?.trim() &&
      (formData.status === "scheduled" || formData.status === "in-progress");
    let payload = promoteToCompleted
      ? { ...formData, status: "completed" }
      : formData;

    // The server creates one session per occurrence and links them with a
    // shared seriesId.
    if (recurrenceFrequency !== "none") {
      const occ = Math.min(Math.max(parseInt(recurrenceOccurrences, 10) || 1, 1), 26);
      payload = {
        ...payload,
        recurrence: { frequency: recurrenceFrequency, occurrences: occ },
      };
    }

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save session");
      }

      const savedSession = await response.json();

      clearDraft();

      // Call the success callback with the saved session
      if (onSuccess) {
        onSuccess(savedSession);
      }
    } catch (err) {
      console.error("Error saving session:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {draftRestored && (
        <DraftRestoredNotice
          onDismiss={dismissRestored}
          onDiscard={() => {
            const nextForm = emptySession(initialClientId, initialDate);
            clearDraft({ formData: nextForm, recurrenceFrequency: "none", recurrenceOccurrences: 8 });
            setFormData(nextForm);
            setRecurrenceFrequency("none");
            setRecurrenceOccurrences(8);
          }}
        />
      )}
      {error && (
        <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F5C6C0", borderRadius: 12, padding: "10px 14px" }}>
          <p style={{ fontSize: 13, color: "#C0392B", margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={CARD}>
        <H>Schedule</H>
        <div>
          <label style={LABEL}>Client{REQUIRED}</label>
          <select
            value={formData.clientId}
            onChange={(e) => set("clientId", e.target.value)}
            disabled={loadingClients}
            style={fieldStyle(!!validationErrors.clientId)}
            onFocus={focusRing}
            onBlur={blurRing}
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
          <Err>{validationErrors.clientId}</Err>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", columnGap: 28 }}>
          <div>
            <label style={LABEL}>Date &amp; time{REQUIRED}</label>
            <DatePicker
              selected={new Date(formData.date)}
              onChange={(date) => set("date", date.toISOString())}
              showTimeSelect
              timeFormat="h:mm aa"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              customInput={<DateInput invalid={!!validationErrors.date} />}
              wrapperClassName="w-full"
            />
            <Err>{validationErrors.date}</Err>
          </div>
          <div>
            <label style={LABEL}>Duration (minutes){REQUIRED}</label>
            <input
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => set("duration", e.target.value)}
              style={fieldStyle(!!validationErrors.duration)}
              onFocus={focusRing}
              onBlur={blurRing}
            />
            <Err>{validationErrors.duration}</Err>
          </div>
        </div>
        {/* Recurrence — behavior unchanged, restyled only */}
        <label style={LABEL}>Repeat</label>
        <p style={HINT}>
          Optional — pre-schedule a standing slot. Each occurrence is its own session
          you can edit or cancel later.
        </p>
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <select
            value={recurrenceFrequency}
            onChange={(e) => setRecurrenceFrequency(e.target.value)}
            style={{ ...fieldStyle(false), width: "auto", minWidth: 180 }}
            onFocus={focusRing}
            onBlur={blurRing}
          >
            <option value="none">Does not repeat</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
          </select>
          {recurrenceFrequency !== "none" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#41557A" }}>
              Occurrences
              <input
                type="number"
                min={1}
                max={26}
                value={recurrenceOccurrences}
                onChange={(e) => setRecurrenceOccurrences(e.target.value)}
                style={{ ...fieldStyle(false), width: 84 }}
                onFocus={focusRing}
                onBlur={blurRing}
              />
              <span style={{ fontSize: 12, color: "#8298BC" }}>(max 26)</span>
            </label>
          )}
        </div>
      </div>

      <div style={CARD}>
        <H>Details</H>
        <label style={LABEL}>Session type{REQUIRED}</label>
        <InlineEnum
          value={formData.type}
          onChange={(v) => set("type", v)}
          options={SESSION_TYPE_OPTIONS}
          colors={SESSION_TYPE_COLORS}
        />
        <Err>{validationErrors.type}</Err>
        <label style={LABEL}>Format{REQUIRED}</label>
        <InlineEnum
          value={formData.format}
          onChange={(v) => set("format", v)}
          options={SESSION_FORMAT_OPTIONS}
          colors={SESSION_FORMAT_COLORS}
        />
        <Err>{validationErrors.format}</Err>
        <label style={LABEL}>Status</label>
        <InlineEnum
          value={formData.status}
          onChange={(v) => set("status", v)}
          options={SESSION_STATUS_OPTIONS}
          colors={SESSION_STATUS_COLORS}
        />
      </div>

      <div style={CARD}>
        <H>Notes</H>
        <label style={LABEL}>
          Session notes{formData.status === "completed" && REQUIRED}
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={10}
          style={{ ...fieldStyle(!!validationErrors.notes), resize: "vertical" }}
          onFocus={focusRing}
          onBlur={blurRing}
          placeholder="Enter session notes, observations, and next steps..."
        />
        <Err>{validationErrors.notes}</Err>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
        <DraftSaveIndicator state={saveState} />
        <button
          type="button"
          onClick={() => { clearDraft(); onCancel?.(); }}
          disabled={loading}
          style={{ border: "1px solid #DCE6F3", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#55698F", fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 10 }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{ border: "none", cursor: loading ? "default" : "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "11px 24px", borderRadius: 10, boxShadow: "0 12px 28px -12px rgba(47,128,255,.8)", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Creating…" : "Create session"}
        </button>
      </div>
    </form>
  );
}
