"use client";

import { useEffect, useState } from "react";
import { AgentReportBody } from "@/components/ai/AgentReportBody";
import { Section, Empty } from "@/components/ai/Section";

// Renders the four specialist agent envelopes (assessment/diagnostic/treatment/progress)
// for the current session/client as stacked sections in clinical order. No inner tab chrome.

function pickLatest(reports, agentType) {
  return reports
    .filter((r) => r.agentType === agentType)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

export default function SessionAIInsights({ session, refreshKey = 0 }) {
  const [assessment, setAssessment] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [progress, setProgress] = useState(null);
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

        // Session-scoped: progress is per-session
        setProgress(pickLatest(sessionReports, "progress") ?? null);
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

  if (loading) return <div className="p-4">Loading insights...</div>;
  if (error) return <div className="p-4 text-red-500">Error fetching insights: {error}</div>;

  if (!assessment && !diagnostic && !treatment && !progress) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-600">
          No AI insights available yet. They will appear once the agents run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Assessment" summary={assessment?.summary}>
        {assessment ? (
          <AgentReportBody agentType="assessment" payload={assessment.payload} />
        ) : (
          <Empty>Assessment generates automatically when a client is created.</Empty>
        )}
      </Section>
      <Section title="Diagnostic Impression" summary={diagnostic?.summary}>
        {diagnostic ? (
          <AgentReportBody agentType="diagnostic" payload={diagnostic.payload} />
        ) : (
          <Empty>Generated automatically after the assessment.</Empty>
        )}
      </Section>
      <Section title="Treatment Plan" summary={treatment?.summary}>
        {treatment ? (
          <AgentReportBody agentType="treatment" payload={treatment.payload} />
        ) : (
          <Empty>Generated automatically when you open a scheduled session.</Empty>
        )}
      </Section>
      <Section title="Progress Report" summary={progress?.summary}>
        {progress ? (
          <AgentReportBody agentType="progress" payload={progress.payload} />
        ) : (
          <Empty>Generated automatically after you complete a session.</Empty>
        )}
      </Section>
    </div>
  );
}
