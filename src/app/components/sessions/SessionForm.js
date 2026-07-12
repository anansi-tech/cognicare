"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftRestoredNotice, DraftSaveIndicator } from "@/components/ui/DraftRestoredNotice";

function sessionFormValue(session, initialClientId, initialDate) {
  if (session) {
    return {
      clientId: session.clientId._id || session.clientId,
      date: session.date,
      duration: session.duration,
      type: session.type,
      format: session.format,
      status: session.status,
      notes: session.notes || "",
      concerns: session.concerns || "",
      progress: session.progress || "",
      nextSteps: session.nextSteps || "",
    };
  }
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

export default function SessionForm({
  session,
  onSuccess,
  onCancel,
  initialClientId,
  initialDate,
}) {
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [formData, setFormData] = useState(() =>
    sessionFormValue(session, initialClientId, initialDate)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  // Recurrence (Round 15) — only meaningful on create.
  const isEditing = !!session?._id;

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
    `session-draft-${session?._id ?? "new"}`,
    draftValue,
    applyDraft,
    true,
    { serverUpdatedAt: session?.updatedAt }
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

  // If editing, populate the form with existing session data
  useEffect(() => {
    if (session) {
      setFormData(sessionFormValue(session, initialClientId, initialDate));
    }
    // Re-seed only when opening a different session; background refreshes must
    // not overwrite an in-progress local draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?._id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date: date.toISOString(),
    }));
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

    // Attach recurrence on create only. The server creates one session per
    // occurrence and links them with a shared seriesId.
    if (!isEditing && recurrenceFrequency !== "none") {
      const occ = Math.min(Math.max(parseInt(recurrenceOccurrences, 10) || 1, 1), 26);
      payload = {
        ...payload,
        recurrence: { frequency: recurrenceFrequency, occurrences: occ },
      };
    }

    try {
      const url = session?._id ? `/api/sessions/${session._id}` : "/api/sessions";
      const method = session?._id ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
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
      console.log("Session saved successfully:", savedSession);

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {draftRestored && (
        <DraftRestoredNotice
          onDismiss={dismissRestored}
          onDiscard={() => {
            const nextForm = sessionFormValue(session, initialClientId, initialDate);
            clearDraft({ formData: nextForm, recurrenceFrequency: "none", recurrenceOccurrences: 8 });
            setFormData(nextForm);
            setRecurrenceFrequency("none");
            setRecurrenceOccurrences(8);
          }}
        />
      )}
      {error && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client <span className="text-red-500">*</span>
          </label>
          <select
            name="clientId"
            value={formData.clientId}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${
              validationErrors.clientId ? "border-red-500" : "border-gray-300"
            }`}
            disabled={loadingClients}
          >
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
          {validationErrors.clientId && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.clientId}</p>
          )}
        </div>

        {/* Date and Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date & Time <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={new Date(formData.date)}
            onChange={handleDateChange}
            showTimeSelect
            timeFormat="h:mm aa"
            timeIntervals={15}
            dateFormat="MMMM d, yyyy h:mm aa"
            className={`w-full p-2 border rounded ${
              validationErrors.date ? "border-red-500" : "border-gray-300"
            }`}
          />
          {validationErrors.date && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.date}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            min="1"
            className={`w-full p-2 border rounded ${
              validationErrors.duration ? "border-red-500" : "border-gray-300"
            }`}
          />
          {validationErrors.duration && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.duration}</p>
          )}
        </div>

        {/* Session Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Type <span className="text-red-500">*</span>
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${
              validationErrors.type ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="initial">Initial Assessment</option>
            <option value="followup">Follow-up</option>
            <option value="assessment">Assessment</option>
            <option value="crisis">Crisis Intervention</option>
            <option value="group">Group Session</option>
            <option value="family">Family Session</option>
          </select>
          {validationErrors.type && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.type}</p>
          )}
        </div>

        {/* Session Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format <span className="text-red-500">*</span>
          </label>
          <select
            name="format"
            value={formData.format}
            onChange={handleChange}
            className={`w-full p-2 border rounded ${
              validationErrors.format ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="in-person">In-Person</option>
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="chat">Chat</option>
          </select>
          {validationErrors.format && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.format}</p>
          )}
        </div>

        {/* Session Status */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-show</option>
          </select>
        </div>

        {/* Session Notes */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Notes{" "}
            {formData.status === "completed" && <span className="text-red-500">*</span>}
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={6}
            className={`w-full p-2 border rounded ${
              validationErrors.notes ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter session notes, observations, and next steps..."
          ></textarea>
          {validationErrors.notes && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.notes}</p>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="rounded-md border border-gray-200 p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Repeat</p>
          <p className="text-xs text-gray-500 mt-1">
            Optional — pre-schedule a standing slot. Each occurrence is its own session
            you can edit or cancel later.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={recurrenceFrequency}
              onChange={(e) => setRecurrenceFrequency(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="none">Does not repeat</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
            </select>
            {recurrenceFrequency !== "none" && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                Occurrences
                <input
                  type="number"
                  min={1}
                  max={26}
                  value={recurrenceOccurrences}
                  onChange={(e) => setRecurrenceOccurrences(e.target.value)}
                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-gray-500">(max 26)</span>
              </label>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-4 pt-4">
        <DraftSaveIndicator state={saveState} />
        <button
          type="button"
          onClick={() => { clearDraft(); onCancel?.(); }}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Session"}
        </button>
      </div>
    </form>
  );
}
