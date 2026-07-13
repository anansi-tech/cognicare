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

// Does `downstream` still reflect `upstream`'s current content? Staleness is a
// content-hash mismatch: `upstream.payloadHash` is computed server-side on read,
// `downstream[sourceKey]` was stamped at generation or last human reconciliation.
// Reverting an edit restores the original hash, so prompts clear themselves; a
// missing stamp (pre-backfill doc) reads as stale — run the backfill, not a
// timestamp fallback.
function upstreamStale(upstream, downstream, sourceKey) {
  if (!upstream?.payloadHash || !downstream) return false;
  return upstream.payloadHash !== downstream[sourceKey];
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
  const [regenerating, setRegenerating] = useState(null); // "assessment" | "diagnostic" | "treatment"
  // Regeneration failures render inline — the preserved reports must stay
  // visible, so this never goes through the full-panel `error` state.
  const [regenError, setRegenError] = useState(null);
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
    setRegenError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "intake-cascade", from }),
      });
      if (!res.ok) {
        throw new Error(
          (await res.json().catch(() => null))?.error ??
            "Regeneration failed — your previous reports are unchanged."
        );
      }
      setLocalRefresh((k) => k + 1);
      onRegenerated?.();
    } catch (e) {
      setRegenError(e.message ?? "Regeneration failed — your previous reports are unchanged.");
    } finally {
      setRegenerating(null);
    }
  };

  // Post-session counterpart: revise rather than replace. Non-destructive — the
  // current plan is kept as v(n) in the version chain.
  const reviseTreatment = async () => {
    const v = treatment?.version ?? 1;
    const confirmed = window.confirm(
      `Generate a revised treatment plan (v${v + 1}) based on the latest diagnosis, progress, and measures?\n\nYour current plan is kept as v${v}.`
    );
    if (!confirmed) return;
    setRegenerating("treatment");
    setRegenError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "revise-treatment" }),
      });
      if (!res.ok) {
        throw new Error(
          (await res.json().catch(() => null))?.error ??
            "Revision failed — your current plan is unchanged."
        );
      }
      setLocalRefresh((k) => k + 1);
      onRegenerated?.();
    } catch (e) {
      setRegenError(e.message ?? "Revision failed — your current plan is unchanged.");
    } finally {
      setRegenerating(null);
    }
  };

  // Assessment edits reconcile sourceNotesHash server-side; poke the parent so
  // the notes banner (which reads that hash) refreshes without a page reload.
  const ax = useEditableReport({
    clientId,
    report: assessment,
    onUpdated: (r) => { setAssessment(r); onRegenerated?.(); },
  });
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

  // Content-hash staleness across the chain. Each downstream artifact stores
  // the hash of the upstream it was derived from (or last reconciled with);
  // divergence means the upstream's CURRENT content is not what it reflects.
  const dxStaleVsAssessment = upstreamStale(assessment, diagnostic, "sourceAssessmentHash");
  const txStaleVsDiagnostic = upstreamStale(diagnostic, treatment, "sourceDiagnosticHash");
  const txStaleVsAssessment = upstreamStale(assessment, treatment, "sourceAssessmentHash");

  // Post-session, the intake chain is history — an upstream divergence prompts
  // a plan REVISION (new version, prior kept) rather than R51's replace.
  // Exactly one nudge; the diagnosis is the closer input to the plan, so it
  // wins if both diverged. Pre-session this is inert and the R51 offers show
  // instead, so the two modes can never appear together.
  const reviseNudge = cascadeAllowed
    ? null
    : txStaleVsDiagnostic
      ? "diagnostic"
      : txStaleVsAssessment
        ? "assessment"
        : null;

  const reviseNudgeText = (label) =>
    `You've updated the ${label} since the current plan (v${treatmentVersion ?? 1}) was created. Revise the treatment plan in light of it? Your current plan is preserved.`;

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;

  return (
    <div className="space-y-6">
      {regenError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{regenError}</span>
          <button
            type="button"
            onClick={() => setRegenError(null)}
            aria-label="Dismiss"
            className="font-semibold hover:opacity-70"
          >
            ✕
          </button>
        </div>
      )}
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
            {cascadeAllowed && dxStaleVsAssessment && (
              <CascadeOffer
                text="You've edited the assessment. Regenerate the diagnosis and treatment plan from your corrections? This replaces the current drafts."
                buttonLabel="Regenerate downstream"
                busy={regenerating === "assessment"}
                onRun={() => runCascade("assessment")}
              />
            )}
            {reviseNudge === "assessment" && (
              <CascadeOffer
                text={reviseNudgeText("assessment")}
                buttonLabel="Revise plan"
                busy={regenerating === "treatment"}
                onRun={reviseTreatment}
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
            {cascadeAllowed && txStaleVsDiagnostic && (
              <CascadeOffer
                text="You've edited the diagnosis. Regenerate the treatment plan from it? This replaces the current draft."
                buttonLabel="Regenerate treatment"
                busy={regenerating === "diagnostic"}
                onRun={() => runCascade("diagnostic")}
              />
            )}
            {reviseNudge === "diagnostic" && (
              <CascadeOffer
                text={reviseNudgeText("diagnosis")}
                buttonLabel="Revise plan"
                busy={regenerating === "treatment"}
                onRun={reviseTreatment}
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
            {/* Periodic plan review — post-session only. Pre-session the R51
                replace offers are the correct path, and revising there would
                mint v2 and permanently close the cascade gate. What revising
                does (v(n+1), prior kept) is spelled out in the confirm dialog. */}
            {!cascadeAllowed && (
              <div className="mt-3 pt-3 border-t border-border/60 flex justify-end">
                <button
                  type="button"
                  onClick={reviseTreatment}
                  disabled={regenerating === "treatment"}
                  className="text-xs font-semibold text-primary hover:text-primary/80 disabled:opacity-60"
                >
                  {regenerating === "treatment" ? "Revising…" : "Revise plan"}
                </button>
              </div>
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
