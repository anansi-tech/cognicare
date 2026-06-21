"use client";

import { useEffect, useState } from "react";
import { useLiam } from "@/components/liam/LiamProvider";
import { AgentReportBody, TreatmentBody } from "@/components/ai/AgentReportBody";
import { Section, Empty } from "@/components/ai/Section";
import { SaveIndicator } from "@/components/ai/editable";
import { useEditableReport } from "@/components/ai/useEditableReport";

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
        setTreatment(pickLatest(reports, "treatment") ?? null);
        setProgress(pickLatest(reports, "progress") ?? null);
      } catch (e) {
        if (!cancelled) setError(e.message ?? "Failed to fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [clientId, refreshKey]);

  const tx = useEditableReport({ clientId, report: treatment, onUpdated: setTreatment });

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
                <div className="flex items-center gap-3">
                  <SaveIndicator state={tx.saveState} />
                  <button
                    onClick={tx.approve}
                    className="rounded-md bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}
            {treatment.status === "approved" && tx.isEditing && (
              <div className="flex items-center justify-between mb-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                <span className="text-xs font-medium text-gray-700">Editing — changes save automatically</span>
                <div className="flex items-center gap-3">
                  <SaveIndicator state={tx.saveState} />
                  <button
                    onClick={tx.approve}
                    className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-white hover:bg-primary/90"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}
            {tx.canEdit ? (
              <TreatmentBody
                payload={tx.edited}
                editable={true}
                onChange={tx.setEdited}
              />
            ) : (
              <>
                <AgentReportBody agentType="treatment" payload={treatment.payload} />
                <button
                  onClick={tx.startEdit}
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
