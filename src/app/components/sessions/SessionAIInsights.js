"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentReportBody } from "@/components/ai/AgentReportBody";
import { Section, Empty } from "@/components/ai/Section";
import { IconButton } from "@/components/ai/editable";

// Renders the four specialist agent envelopes (assessment/diagnostic/treatment/progress)
// for the current session/client as stacked document-mode sections in clinical
// order (Overview v2 parity). Read-only here — editing lives in the client
// Overview; the header action deep-links there.

function pickLatest(reports, agentType) {
  return reports
    .filter((r) => r.agentType === agentType)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;

// Same pill vocabulary and styles as the Overview's SectionHeaderActions.
function StatusPill({ status }) {
  if (status === "approved") {
    return <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: "#E7F6EC", color: "#3B9E57" }}>Approved</span>;
  }
  if (status === "draft") {
    return <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", background: "#FBF2DA", color: "#A9821F" }}>Draft — review</span>;
  }
  return null;
}

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// `onNotesStale` (optional, MUST be referentially stable): receives a boolean —
// whether the session's notes diverged from what this session's progress/
// documentation pair was generated (or last reconciled) from. The parent
// renders the regenerate nudge above the SOAP section.
// `onReportsChange` (optional, stable): receives { treatment, progress,
// documentation } so the session rail can derive nav dots/meta — display
// data only, no new fetches.
export default function SessionAIInsights({ session, refreshKey = 0, focus, onNotesStale, onReportsChange }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [progress, setProgress] = useState(null);
  const [documentation, setDocumentation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clientId =
    typeof session?.clientId === "object" ? session?.clientId?._id : session?.clientId;
  const sessionId = session?._id;

  useEffect(() => {
    if (!clientId || !sessionId) return;
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sessionRes, clientRes] = await Promise.all([
          fetch(`/api/clients/${clientId}/ai-reports?sessionId=${sessionId}`),
          fetch(`/api/clients/${clientId}/ai-reports`),
        ]);
        if (!sessionRes.ok || !clientRes.ok) throw new Error("Failed to fetch insights");
        const sessionReports = (await sessionRes.json()).reports ?? [];
        const clientReports = (await clientRes.json()).reports ?? [];

        if (cancelled) return;

        // Session-scoped: progress + documentation are per-session (the note
        // itself renders in SessionNote; the doc is held here only for the
        // notes-staleness comparison).
        setProgress(pickLatest(sessionReports, "progress") ?? null);
        setDocumentation(pickLatest(sessionReports, "documentation") ?? null);
        // Client-scoped: assessment, diagnostic, treatment carry across sessions
        setAssessment(pickLatest(clientReports, "assessment") ?? null);
        setDiagnostic(pickLatest(clientReports, "diagnostic") ?? null);
        setTreatment(pickLatest(clientReports, "treatment") ?? null);
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
  }, [clientId, sessionId, refreshKey]);

  // Session edge (R54): the pair regenerates together, so one notes-edge
  // signal covers both. A missing stamp reads as stale — backfill is the
  // remedy, not a fallback. Reverting the notes restores the hash and clears.
  const currentNotesHash = session?.notesHash;
  const notesStale = !!(
    currentNotesHash &&
    ((progress && progress.sourceNotesHash !== currentNotesHash) ||
      (documentation && documentation.sourceNotesHash !== currentNotesHash))
  );
  useEffect(() => {
    if (loading) return;
    onNotesStale?.(notesStale);
  }, [notesStale, loading, onNotesStale]);

  useEffect(() => {
    if (loading) return;
    onReportsChange?.({ treatment, progress, documentation });
  }, [treatment, progress, documentation, loading, onReportsChange]);

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

  const sessionOnly = focus === "session";

  if (sessionOnly ? (!treatment && !progress) : (!assessment && !diagnostic && !treatment && !progress)) {
    return (
      <div className="rounded-lg border border-border bg-accent/30 p-4">
        <p className="text-sm text-muted-foreground">
          No AI insights available yet. They will appear once the agents run.
        </p>
      </div>
    );
  }

  // Status pill + a jump to the client record, where these reports are edited.
  const openInRecord = (
    <IconButton title="Open in client record" onClick={() => router.push(`/clients/${clientId}?tab=overview`)}>
      <ExternalLinkIcon />
    </IconButton>
  );
  const actionsFor = (report) =>
    report ? (
      <>
        <StatusPill status={report.status} />
        {openInRecord}
      </>
    ) : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!sessionOnly && (
        <Section
          id="sec-assessment"
          sticky
          title="Assessment"
          summary={assessment?.summary}
          subtitle={fmtDate(assessment?.createdAt) ? `Updated ${fmtDate(assessment?.createdAt)}` : undefined}
          draft={assessment?.status === "draft"}
          actions={actionsFor(assessment)}
        >
          {assessment ? (
            <AgentReportBody agentType="assessment" payload={assessment.payload} />
          ) : (
            <Empty>Assessment generates automatically when a client is created.</Empty>
          )}
        </Section>
      )}
      {!sessionOnly && (
        <Section
          id="sec-diagnosis"
          sticky
          title="Diagnostic impression"
          summary={diagnostic?.summary}
          subtitle={fmtDate(diagnostic?.createdAt) ? `Updated ${fmtDate(diagnostic?.createdAt)}` : undefined}
          draft={diagnostic?.status === "draft"}
          actions={actionsFor(diagnostic)}
        >
          {diagnostic ? (
            <AgentReportBody agentType="diagnostic" payload={diagnostic.payload} />
          ) : (
            <Empty>Generated automatically after the assessment.</Empty>
          )}
        </Section>
      )}
      <Section
        id="sec-treatment"
        sticky
        title={
          <>
            Treatment plan
            {treatment?.version ? <span style={{ fontSize: 12, fontWeight: 700, color: "#8298BC", marginLeft: 6 }}>v{treatment.version}</span> : null}
          </>
        }
        summary={treatment?.summary}
        subtitle={fmtDate(treatment?.createdAt) ? `Client-scoped · Updated ${fmtDate(treatment?.createdAt)}` : undefined}
        draft={treatment?.status === "draft"}
        actions={actionsFor(treatment)}
      >
        {treatment ? (
          <AgentReportBody agentType="treatment" payload={treatment.payload} />
        ) : (
          <Empty>Generated automatically when you open a scheduled session.</Empty>
        )}
      </Section>
      <Section
        id="sec-progress"
        sticky
        title="Progress report"
        summary={progress?.summary}
        subtitle={fmtDate(progress?.createdAt) ? `This session · Generated ${fmtDate(progress?.createdAt)}` : undefined}
        draft={progress?.status === "draft"}
        actions={actionsFor(progress)}
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
