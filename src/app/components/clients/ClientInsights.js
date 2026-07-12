"use client";

import { useEffect, useState } from "react";
import { useLiam } from "@/components/liam/LiamProvider";
import { AgentReportBody, TreatmentBody, AssessmentBody, DiagnosticBody, ProgressBody } from "@/components/ai/AgentReportBody";
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

// Was `upstream` edited by a human after `downstream` was derived from it?
// Keys off editedAt, not updatedAt — approving without editing must not count.
function editedSince(upstream, downstream) {
  if (!upstream?.editedAt || !downstream?.createdAt) return false;
  return new Date(upstream.editedAt) > new Date(downstream.createdAt);
}

// The offer to re-derive downstream artifacts. Never fires on its own.
function CascadeOffer({ text, buttonLabel, busy, onRun }) {
  return (
    <div style={{ marginTop: 12, background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 12, padding: "12px 14px" }}>
      <p style={{ fontSize: 13.5, color: "#7A6020", margin: 0 }}>{text}</p>
      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        style={{ marginTop: 9, borderRadius: 9, background: "#A9821F", color: "#fff", padding: "6px 14px", fontSize: 13, fontWeight: 600, border: "none", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
        className="hover:opacity-90 transition-opacity"
      >
        {busy ? "Regenerating…" : buttonLabel}
      </button>
    </div>
  );
}

export default function ClientInsights({ clientId, refreshKey = 0, onRegenerated }) {
  const [assessment, setAssessment] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cascadeAllowed, setCascadeAllowed] = useState(false);
  const [regenerating, setRegenerating] = useState(null); // "assessment" | "diagnostic"
  const [localRefresh, setLocalRefresh] = useState(0);
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
  }, [clientId, refreshKey, localRefresh]);

  // Whether the intake chain may still be re-derived (pre-session only).
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/regenerate`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setCascadeAllowed(!!d?.cascadeAllowed); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientId, refreshKey, localRefresh]);

  const runCascade = async (from) => {
    const message = from === "assessment"
      ? "Regenerate the diagnosis and treatment plan from your edited assessment?\n\nThis replaces the current drafts."
      : "Regenerate the treatment plan from your edited diagnosis?\n\nThis replaces the current draft.";
    if (!window.confirm(message)) return;
    setRegenerating(from);
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "intake-cascade", from }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Regeneration failed");
      setLocalRefresh((k) => k + 1);
      onRegenerated?.();
    } catch (e) {
      setError(e.message ?? "Regeneration failed");
    } finally {
      setRegenerating(null);
    }
  };

  const ax = useEditableReport({ clientId, report: assessment, onUpdated: setAssessment });
  const dx = useEditableReport({ clientId, report: diagnostic, onUpdated: setDiagnostic });
  const tx = useEditableReport({ clientId, report: treatment, onUpdated: setTreatment });
  const px = useEditableReport({ clientId, report: progress, onUpdated: setProgress });

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

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;

  return (
    <div className="space-y-6">
      <Section
        title="Assessment"
        summary={assessment?.summary}
        collapsible
        defaultOpen
        subtitle={`Assessment agent${fmtDate(assessment?.createdAt) ? ` · Updated ${fmtDate(assessment?.createdAt)}` : ""}`}
      >
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
            {cascadeAllowed && editedSince(assessment, diagnostic) && (
              <CascadeOffer
                text="You've edited the assessment. Regenerate the diagnosis and treatment plan from your corrections? This replaces the current drafts."
                buttonLabel="Regenerate downstream"
                busy={regenerating === "assessment"}
                onRun={() => runCascade("assessment")}
              />
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
        subtitle={`Diagnostic agent${fmtDate(diagnostic?.createdAt) ? ` · Updated ${fmtDate(diagnostic?.createdAt)}` : ""}`}
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
            {cascadeAllowed && editedSince(diagnostic, treatment) && (
              <CascadeOffer
                text="You've edited the diagnosis. Regenerate the treatment plan from it? This replaces the current draft."
                buttonLabel="Regenerate treatment"
                busy={regenerating === "diagnostic"}
                onRun={() => runCascade("diagnostic")}
              />
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
        subtitle={`Treatment agent${fmtDate(treatment?.createdAt) ? ` · Updated ${fmtDate(treatment?.createdAt)}` : ""}`}
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
        subtitle={`Progress agent${fmtDate(progress?.createdAt) ? ` · Updated ${fmtDate(progress?.createdAt)}` : ""}`}
        badge={progress?.payload?.reassessmentRecommended ? "Reassessment recommended" : undefined}
      >
        {progress ? (
          <>
            <EditApproveBar tx={px} report={progress} draftLabel="Draft" />
            {px.canEdit ? (
              <ProgressBody payload={px.edited} editable onChange={px.setEdited} />
            ) : (
              <>
                <ProgressBody payload={progress.payload} />
                <button
                  onClick={px.startEdit}
                  className="mt-2 text-xs text-primary hover:text-primary/80"
                >
                  Edit progress
                </button>
              </>
            )}
          </>
        ) : (
          <Empty>Generated automatically after you complete a session.</Empty>
        )}
      </Section>
    </div>
  );
}
