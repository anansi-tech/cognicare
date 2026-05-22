"use client";

import { useEffect, useState } from "react";
import { AgentReportBody } from "@/components/ai/AgentReportBody";

// Renders the five specialist agent envelopes for a session/client in tabs.
// Reads the new schemas/agent envelope shape — { agentType, summary, payload }.

const TABS = [
  ["assessment", "📊", "Assessment"],
  ["diagnostic", "🔍", "Diagnostic"],
  ["treatment", "💡", "Treatment"],
  ["progress", "📈", "Progress"],
];

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
  const [activeTab, setActiveTab] = useState("assessment");

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

  if (!assessment && !diagnostic && !treatment && !progress) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-600">
          No AI insights available yet. They will appear once the agents run.
        </p>
      </div>
    );
  }

  if (error) return <div className="p-4 text-red-500">Error fetching insights: {error}</div>;

  const ap = assessment?.payload;
  const dp = diagnostic?.payload;
  const tp = treatment?.payload;
  const pp = progress?.payload;

  return (
    <div className="w-full">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {TABS.map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex flex-col items-center p-4 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="text-xl mb-1">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-4 space-y-6">
        {/* Assessment */}
        {activeTab === "assessment" &&
          (assessment ? (
            <>
              {assessment.summary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                  <p className="text-gray-700 leading-relaxed">{assessment.summary}</p>
                </div>
              )}
              <AgentReportBody agentType="assessment" payload={ap} />
            </>
          ) : (
            <p className="text-sm text-gray-500">No assessment yet.</p>
          ))}

        {/* Diagnostic */}
        {activeTab === "diagnostic" &&
          (diagnostic ? (
            <>
              {diagnostic.summary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                  <p className="text-gray-700 leading-relaxed">{diagnostic.summary}</p>
                </div>
              )}
              <AgentReportBody agentType="diagnostic" payload={dp} />
            </>
          ) : (
            <p className="text-sm text-gray-500">No diagnostic yet.</p>
          ))}

        {/* Treatment */}
        {activeTab === "treatment" &&
          (treatment ? (
            <>
              {treatment.summary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                  <p className="text-gray-700 leading-relaxed">{treatment.summary}</p>
                </div>
              )}
              <AgentReportBody agentType="treatment" payload={tp} />
            </>
          ) : (
            <p className="text-sm text-gray-500">No treatment plan yet.</p>
          ))}

        {/* Progress */}
        {activeTab === "progress" &&
          (progress ? (
            <>
              {progress.summary && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                  <p className="text-gray-700 leading-relaxed">{progress.summary}</p>
                </div>
              )}
              <AgentReportBody agentType="progress" payload={pp} />
            </>
          ) : (
            <p className="text-sm text-gray-500">No progress evaluation yet.</p>
          ))}
      </div>
    </div>
  );
}
