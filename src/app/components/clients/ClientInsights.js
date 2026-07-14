"use client";

import { useEffect, useState } from "react";
import { useLiam } from "@/components/liam/LiamProvider";
import { AgentReportBody, TreatmentBody, AssessmentBody, DiagnosticBody, ProgressBody } from "@/components/ai/AgentReportBody";
import { Section, Empty } from "@/components/ai/Section";
import { SectionHeaderActions, IconButton } from "@/components/ai/editable";
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

// The offer to re-derive downstream artifacts — a slim amber strip rendered in
// the Section `nudge` slot, directly under the section header. Never fires on
// its own.
function CascadeOffer({ text, buttonLabel, busy, onRun }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "12px 20px 0", background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 11, padding: "9px 14px" }}>
      <span style={{ fontSize: 12.5, color: "#7A6020", flex: 1, minWidth: 200 }}>{text}</span>
      <button
        type="button"
        onClick={onRun}
        disabled={busy}
        style={{ flexShrink: 0, border: "none", borderRadius: 8, background: "#A9821F", color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
        className="hover:opacity-90 transition-opacity"
      >
        {busy ? "Regenerating…" : buttonLabel}
      </button>
    </div>
  );
}

// `onReportsChange` (optional, MUST be referentially stable — useCallback in
// the parent): receives { assessment, diagnostic, treatment, progress } so the
// Overview rail can derive nav status dots/meta without duplicating fetches.
export default function ClientInsights({ clientId, refreshKey = 0, onRegenerated, onReportsChange }) {
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

  // Keep the parent's navigator rail in sync with report state (fetches AND
  // in-place edits/approvals both land here).
  useEffect(() => {
    if (loading) return;
    onReportsChange?.({ assessment, diagnostic, treatment, progress });
  }, [assessment, diagnostic, treatment, progress, loading, onReportsChange]);

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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
        id="sec-assessment"
        sticky
        title="Assessment"
        summary={assessment?.summary}
        subtitle={fmtDate(assessment?.createdAt) ? `Updated ${fmtDate(assessment?.createdAt)}` : "Assessment agent"}
        draft={assessment?.status === "draft"}
        actions={assessment ? <SectionHeaderActions tx={ax} report={assessment} editLabel="Edit assessment" /> : undefined}
        nudge={
          cascadeAllowed && dxStaleVsAssessment ? (
            <CascadeOffer
              text="You've edited the assessment. Regenerate the diagnosis and treatment plan from your corrections? This replaces the current drafts."
              buttonLabel="Regenerate downstream"
              busy={regenerating === "assessment"}
              onRun={() => runCascade("assessment")}
            />
          ) : null
        }
      >
        {assessment ? (
          ax.canEdit ? (
            <AssessmentBody payload={ax.edited} editable onChange={ax.setEdited} />
          ) : (
            <AssessmentBody payload={assessment.payload} />
          )
        ) : (
          <Empty>Assessment generates automatically when a client is created.</Empty>
        )}
      </Section>
      <Section
        id="sec-diagnosis"
        sticky
        title="Diagnostic impression"
        summary={diagnostic?.summary}
        subtitle={fmtDate(diagnostic?.createdAt) ? `Updated ${fmtDate(diagnostic?.createdAt)}` : "Diagnostic agent"}
        draft={diagnostic?.status === "draft"}
        actions={diagnostic ? <SectionHeaderActions tx={dx} report={diagnostic} editLabel="Edit diagnosis" /> : undefined}
        nudge={
          cascadeAllowed && txStaleVsDiagnostic ? (
            <CascadeOffer
              text="You've edited the diagnosis. Regenerate the treatment plan from it? This replaces the current draft."
              buttonLabel="Regenerate treatment"
              busy={regenerating === "diagnostic"}
              onRun={() => runCascade("diagnostic")}
            />
          ) : null
        }
      >
        {diagnostic ? (
          dx.canEdit ? (
            <DiagnosticBody payload={dx.edited} editable onChange={dx.setEdited} />
          ) : (
            <DiagnosticBody payload={diagnostic.payload} />
          )
        ) : (
          <Empty>Generated automatically after the assessment.</Empty>
        )}
      </Section>
      <Section
        id="sec-treatment"
        sticky
        title={
          <>
            Treatment plan
            {treatmentVersion ? <span style={{ fontSize: 12, fontWeight: 700, color: "#8298BC", marginLeft: 6 }}>v{treatmentVersion}</span> : null}
          </>
        }
        summary={treatment?.summary}
        subtitle={fmtDate(treatment?.createdAt) ? `Updated ${fmtDate(treatment?.createdAt)}` : "Treatment agent"}
        draft={treatment?.status === "draft"}
        actions={
          treatment ? (
            <SectionHeaderActions
              tx={tx}
              report={treatment}
              editLabel="Edit plan"
              // Periodic plan review — post-session only. Pre-session the R51
              // replace offers are the correct path, and revising there would
              // mint v2 and permanently close the cascade gate. What revising
              // does (v(n+1), prior kept) is in the confirm dialog.
              extra={
                !cascadeAllowed ? (
                  <IconButton
                    title="Revise treatment plan (new version)"
                    onClick={reviseTreatment}
                    disabled={regenerating === "treatment"}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                  </IconButton>
                ) : null
              }
            />
          ) : undefined
        }
        nudge={
          reviseNudge ? (
            <CascadeOffer
              text={reviseNudgeText(reviseNudge === "diagnostic" ? "diagnosis" : "assessment")}
              buttonLabel="Revise treatment plan"
              busy={regenerating === "treatment"}
              onRun={reviseTreatment}
            />
          ) : null
        }
      >
        {treatment ? (
          tx.canEdit ? (
            <TreatmentBody payload={tx.edited} editable={true} onChange={tx.setEdited} />
          ) : (
            <AgentReportBody agentType="treatment" payload={treatment.payload} />
          )
        ) : (
          <Empty>Generated automatically at intake or when you open a scheduled session.</Empty>
        )}
      </Section>
      <Section
        id="sec-progress"
        sticky
        title="Progress report"
        summary={progress?.summary}
        subtitle={fmtDate(progress?.createdAt) ? `Updated ${fmtDate(progress?.createdAt)}` : "Progress agent"}
        draft={progress?.status === "draft"}
        badge={progress?.payload?.reassessmentRecommended ? "Reassessment recommended" : undefined}
        actions={progress ? <SectionHeaderActions tx={px} report={progress} editLabel="Edit progress" /> : undefined}
      >
        {progress ? (
          px.canEdit ? (
            <ProgressBody payload={px.edited} editable onChange={px.setEdited} />
          ) : (
            <ProgressBody payload={progress.payload} />
          )
        ) : (
          <Empty>Generated automatically after you complete a session.</Empty>
        )}
      </Section>
    </div>
  );
}
