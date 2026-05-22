"use client";

import { useEffect, useState } from "react";
import { useLiam } from "@/components/liam/LiamProvider";
import { AgentReportBody } from "@/components/ai/AgentReportBody";

// Client-scoped agent insights. Renders the latest envelope of each agent type
// against the current schemas — { agentType, summary, payload }.

const TABS = [
  ["overview", "🩺", "Overview"],
  ["assessment", "📊", "Assessment"],
  ["diagnostic", "🔍", "Diagnostic"],
  ["treatment", "💡", "Treatment"],
  ["progress", "📈", "Progress"],
];

const titleCase = (s) =>
  typeof s === "string" && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const riskBadgeClass = (level) =>
  ({
    none: "bg-green-100 text-green-800",
    low: "bg-blue-100 text-blue-800",
    moderate: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    imminent: "bg-red-100 text-red-800",
  })[level] || "bg-gray-100 text-gray-800";

const goalStatusClass = (status) =>
  ({
    "not-started": "bg-gray-100 text-gray-800",
    emerging: "bg-blue-100 text-blue-800",
    progressing: "bg-yellow-100 text-yellow-800",
    met: "bg-green-100 text-green-800",
    regressed: "bg-red-100 text-red-800",
  })[status] || "bg-gray-100 text-gray-800";

function pickLatest(reports, agentType) {
  return reports
    .filter((r) => r.agentType === agentType)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function Section({ title, children }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <h4 className="text-md font-semibold text-gray-700 mb-3">{title}</h4>
      {children}
    </div>
  );
}

function BulletList({ items, color = "blue" }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className={`text-${color}-500 mt-1`}>•</span>
          <span className="text-gray-700">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ClientInsights({ clientId, refreshKey = 0 }) {
  const [assessment, setAssessment] = useState(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [treatment, setTreatment] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
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
    return () => {
      cancelled = true;
    };
  }, [clientId, refreshKey]);

  if (loading) {
    return (
      <div className="p-4 text-gray-600 flex items-center gap-2">
        <span className="animate-spin">⏳</span> Loading insights...
      </div>
    );
  }

  if (!assessment && !diagnostic && !treatment && !progress) {
    return (
      <div className="bg-blue-100 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <div>
            <h3 className="font-medium text-blue-700">No insights yet!</h3>
            <p className="text-blue-700 text-sm mt-1">
              Agent reports will appear here once an assessment runs.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => setLiamOpen(true)}
            className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Ask LIAM
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 flex items-center gap-2">
        <span className="text-xl">⚠️</span> Error fetching insights: {error}
      </div>
    );
  }

  const ap = assessment?.payload;
  const dp = diagnostic?.payload;
  const tp = treatment?.payload;
  const pp = progress?.payload;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-200">
        {TABS.map(([key, , label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview — compact across the four reports */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {ap && (
            <Section title="Assessment">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${riskBadgeClass(
                    ap.riskLevel
                  )}`}
                >
                  Risk: {titleCase(ap.riskLevel)}
                </span>
              </div>
              {assessment?.summary && (
                <p className="text-gray-700 text-sm leading-relaxed">{assessment.summary}</p>
              )}
              {ap.immediateAttention?.length > 0 && (
                <div className="mt-3 bg-red-50 p-3 rounded">
                  <p className="text-xs font-medium text-red-700 mb-1">Immediate attention</p>
                  <BulletList items={ap.immediateAttention} color="red" />
                </div>
              )}
            </Section>
          )}

          {dp?.primaryDiagnosis && (
            <Section title="Primary Diagnosis">
              <p className="font-medium text-gray-800">{dp.primaryDiagnosis.name}</p>
              <p className="text-sm text-gray-500">
                Code: {dp.primaryDiagnosis.code} ·{" "}
                {titleCase(dp.primaryDiagnosis.confidence)} confidence
              </p>
              {diagnostic?.summary && (
                <p className="text-gray-700 text-sm leading-relaxed mt-2">{diagnostic.summary}</p>
              )}
            </Section>
          )}

          {tp && (
            <Section title="Treatment Plan">
              {tp.approach && (
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">Approach:</span> {tp.approach}
                </p>
              )}
              {treatment?.summary && (
                <p className="text-gray-700 text-sm leading-relaxed mt-2">{treatment.summary}</p>
              )}
              {tp.goals?.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {tp.goals.length} active goal{tp.goals.length === 1 ? "" : "s"}
                </p>
              )}
            </Section>
          )}

          {pp && (
            <Section title="Latest Progress">
              {progress?.summary && (
                <p className="text-gray-700 text-sm leading-relaxed">{progress.summary}</p>
              )}
              {pp.reassessmentRecommended && (
                <p className="text-sm text-yellow-700 mt-2">
                  ⚠️ Reassessment recommended before the next session.
                </p>
              )}
            </Section>
          )}
        </div>
      )}

      {/* Assessment */}
      {activeTab === "assessment" &&
        (assessment ? (
          <div className="space-y-4">
            {assessment.summary && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                <p className="text-gray-700 leading-relaxed">{assessment.summary}</p>
              </div>
            )}
            <AgentReportBody agentType="assessment" payload={ap} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No assessment yet.</p>
        ))}

      {/* Diagnostic */}
      {activeTab === "diagnostic" &&
        (diagnostic ? (
          <div className="space-y-4">
            {diagnostic.summary && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                <p className="text-gray-700 leading-relaxed">{diagnostic.summary}</p>
              </div>
            )}
            <AgentReportBody agentType="diagnostic" payload={dp} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No diagnostic yet.</p>
        ))}

      {/* Treatment */}
      {activeTab === "treatment" &&
        (treatment ? (
          <div className="space-y-4">
            {treatment.summary && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                <p className="text-gray-700 leading-relaxed">{treatment.summary}</p>
              </div>
            )}
            <AgentReportBody agentType="treatment" payload={tp} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No treatment plan yet.</p>
        ))}

      {/* Progress */}
      {activeTab === "progress" &&
        (progress ? (
          <div className="space-y-4">
            {progress.summary && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                <p className="text-gray-700 leading-relaxed">{progress.summary}</p>
              </div>
            )}
            <AgentReportBody agentType="progress" payload={pp} />
          </div>
        ) : (
          <p className="text-sm text-gray-500">No progress evaluation yet.</p>
        ))}
    </div>
  );
}
