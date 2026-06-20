"use client";

import { useEffect, useState } from "react";
import { useLiam } from "@/components/liam/LiamProvider";
import { AgentReportBody, TreatmentBody } from "@/components/ai/AgentReportBody";
import { Section, Empty } from "@/components/ai/Section";

// Client-scoped agent insights. Renders the latest envelope of each agent type
// against the current schemas — { agentType, summary, payload } — as stacked
// titled sections in clinical order. No inner tab chrome.

function pickLatest(reports, agentType) {
  return reports
    .filter((r) => r.agentType === agentType)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

export default function ClientInsights({ clientId, refreshKey = 0 }) {
  const [assessment, setAssessment] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [editedPayload, setEditedPayload] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setOpen: setLiamOpen } = useLiam();

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/clients/${clientId}/ai-reports`);
        if (!res.ok) throw new Error("Failed to fetch insights");
        const data = await res.json();
        const reports = data.reports ?? [];
        if (cancelled) return;
        setAssessment(pickLatest(reports, "assessment") ?? null);
        setDiagnostic(pickLatest(reports, "diagnostic") ?? null);
        const t = pickLatest(reports, "treatment") ?? null;
        setTreatment(t);
        setEditedPayload(t?.payload ?? null);
        setProgress(pickLatest(reports, "progress") ?? null);
      } catch (e) {
        if (!cancelled) setError(e.message ?? "Failed to fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [clientId, refreshKey]);

  async function saveTreatment() {
    const res = await fetch(`/api/clients/${clientId}/ai-reports/${treatment._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: editedPayload }),
    });
    if (res.ok) {
      const data = await res.json();
      setTreatment((prev) => ({ ...prev, payload: data.payload }));
    }
  }

  async function approveTreatment() {
    const res = await fetch(`/api/clients/${clientId}/ai-reports/${treatment._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: editedPayload, status: "approved" }),
    });
    if (res.ok) {
      const data = await res.json();
      setTreatment((prev) => ({ ...prev, payload: data.payload, status: "approved" }));
      setIsEditing(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
        Loading insights...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Error fetching insights: {error}
      </div>
    );
  }

  if (!assessment && !diagnostic && !treatment && !progress) {
    return (
      <div className="rounded-lg border border-border bg-accent/30 p-4">
        <h3 className="text-sm font-semibold text-foreground">No insights yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Agent reports generate automatically. Open a scheduled session to prep, or complete one
          for the post-session note.
        </p>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => setLiamOpen(true)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ask LIAM
          </button>
        </div>
      </div>
    );
  }

  const treatmentVersion = treatment?.version;
  const treatmentTitle = `Treatment Plan${treatmentVersion ? ` v${treatmentVersion}` : ""}`;

  return (
    <div className="space-y-6">
      <Section title="Assessment" summary={assessment?.summary} collapsible defaultOpen>
        {assessment ? (
          <AgentReportBody agentType="assessment" payload={assessment.payload} />
        ) : (
          <Empty>Assessment generates automatically when a client is created.</Empty>
        )}
      </Section>
      <Section
        title="Diagnostic Impression"
        summary={diagnostic?.summary}
        collapsible
        defaultOpen={false}
      >
        {diagnostic ? (
          <AgentReportBody agentType="diagnostic" payload={diagnostic.payload} />
        ) : (
          <Empty>Generated automatically after the assessment.</Empty>
        )}
      </Section>
      <Section
        title={treatmentTitle}
        summary={treatment?.summary}
        collapsible
        defaultOpen={false}
      >
        {treatment ? (
          <>
            {treatment.status === "draft" && (
              <div className="flex items-center justify-between mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <span className="text-xs font-medium text-amber-800">
                  Draft v{treatment.version ?? 1} — review &amp; approve
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={saveTreatment}
                    className="rounded-md border border-amber-400 bg-white px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={approveTreatment}
                    className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}
            {treatment.status === "approved" && isEditing && (
              <div className="flex items-center justify-between mb-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                <span className="text-xs font-medium text-gray-700">Editing — Save or Approve</span>
                <div className="flex gap-2">
                  <button
                    onClick={saveTreatment}
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={approveTreatment}
                    className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary/90"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}
            {(treatment.status === "draft" || isEditing) ? (
              <TreatmentBody
                payload={editedPayload}
                editable={true}
                onChange={setEditedPayload}
              />
            ) : (
              <>
                <AgentReportBody agentType="treatment" payload={treatment.payload} />
                <button
                  onClick={() => { setIsEditing(true); setEditedPayload(treatment.payload); }}
                  className="mt-2 text-xs text-primary hover:text-primary/80"
                >
                  Edit plan
                </button>
              </>
            )}
          </>
        ) : (
          <Empty>Generated automatically at intake or when you open a scheduled session.</Empty>
        )}
      </Section>
      <Section
        title="Progress Report"
        summary={progress?.summary}
        collapsible
        defaultOpen={false}
      >
        {progress ? (
          <AgentReportBody agentType="progress" payload={progress.payload} />
        ) : (
          <Empty>Generated automatically after you complete a session.</Empty>
        )}
      </Section>
    </div>
  );
}
