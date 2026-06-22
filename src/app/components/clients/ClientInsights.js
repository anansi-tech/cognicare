"use client";

import { useEffect, useState } from "react";
import { useLiam } from "@/components/liam/LiamProvider";
import { AgentReportBody, TreatmentBody, AssessmentBody, DiagnosticBody } from "@/components/ai/AgentReportBody";
import { Section, Empty } from "@/components/ai/Section";
import { EditApproveBar } from "@/components/ai/editable";
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

  const ax = useEditableReport({ clientId, report: assessment, onUpdated: setAssessment });
  const dx = useEditableReport({ clientId, report: diagnostic, onUpdated: setDiagnostic });
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
          <>
            <EditApproveBar tx={ax} report={assessment} draftLabel={`Draft v${assessment.version ?? 1}`} />
            {ax.canEdit ? (
              <AssessmentBody payload={ax.edited} editable onChange={ax.setEdited} />
            ) : (
              <>
                <AssessmentBody payload={assessment.payload} />
                <button
                  onClick={ax.startEdit}
                  className="mt-2 text-xs text-primary hover:text-primary/80"
                >
                  Edit assessment
                </button>
              </>
            )}
          </>
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
          <>
            <EditApproveBar tx={dx} report={diagnostic} draftLabel="Draft" />
            {dx.canEdit ? (
              <DiagnosticBody payload={dx.edited} editable onChange={dx.setEdited} />
            ) : (
              <>
                <DiagnosticBody payload={diagnostic.payload} />
                <button
                  onClick={dx.startEdit}
                  className="mt-2 text-xs text-primary hover:text-primary/80"
                >
                  Edit diagnosis
                </button>
              </>
            )}
          </>
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
            <EditApproveBar tx={tx} report={treatment} draftLabel={`Draft v${treatment.version ?? 1}`} />
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
