"use client";
import { useState, useEffect } from "react";

// Generic edit/autosave/approve controller for any AIReport document.
// Works for any agentType — assessment, diagnostic, treatment, progress.
// report: { _id, payload, status }
// onUpdated(updatedReport): called after a successful save or approve
export function useEditableReport({ clientId, report, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [savedAt, setSavedAt] = useState(null); // Date of last successful save (drives the header dot-time)

  // Seed edited payload whenever the report identity changes (new report loaded).
  // Does NOT re-seed on payload-only updates so in-flight edits are preserved.
  useEffect(() => {
    if (report) setEdited(report.payload);
  }, [report?._id]);

  // Debounced autosave while in edit mode (draft or re-editing approved).
  // Skips the initial sync when edited equals the stored payload.
  useEffect(() => {
    if (!report || edited == null) return;
    if (!(report.status === "draft" || isEditing)) return;
    if (JSON.stringify(edited) === JSON.stringify(report.payload)) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/ai-reports/${report._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload: edited }),
        });
        if (res.ok) {
          const data = await res.json();
          // Hashes ride along so hash-based staleness recomputes immediately
          // from local state — no refetch between an edit and its offer/nudge.
          onUpdated?.({
            ...report,
            payload: data.payload,
            editedAt: data.editedAt,
            payloadHash: data.payloadHash,
            sourceNotesHash: data.sourceNotesHash,
            sourceAssessmentHash: data.sourceAssessmentHash,
            sourceDiagnosticHash: data.sourceDiagnosticHash,
          });
          setSaveState("saved");
          setSavedAt(new Date());
        } else {
          setSaveState("error");
        }
      } catch {
        setSaveState("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [edited, report, isEditing, clientId]);

  async function approve() {
    const res = await fetch(`/api/clients/${clientId}/ai-reports/${report._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: edited, status: "approved" }),
    });
    if (res.ok) {
      const data = await res.json();
      onUpdated?.({
        ...report,
        payload: data.payload,
        status: "approved",
        editedAt: data.editedAt,
        payloadHash: data.payloadHash,
        sourceNotesHash: data.sourceNotesHash,
        sourceAssessmentHash: data.sourceAssessmentHash,
        sourceDiagnosticHash: data.sourceDiagnosticHash,
      });
      setIsEditing(false);
      setSaveState("idle");
      setSavedAt(new Date());
    }
  }

  function startEdit() {
    setEdited(report.payload);
    setIsEditing(true);
  }

  const canEdit = report?.status === "draft" || isEditing;

  return { isEditing, startEdit, edited, setEdited, saveState, savedAt, approve, canEdit };
}
