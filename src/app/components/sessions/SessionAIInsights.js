"use client";

import { useEffect, useState } from "react";

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

const titleCase = (s) =>
  typeof s === "string" && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

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

function Summary({ envelope }) {
  if (!envelope?.summary) return null;
  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
      <p className="text-gray-700 leading-relaxed">{envelope.summary}</p>
    </div>
  );
}

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
          (ap ? (
            <>
              <Summary envelope={assessment} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Section title="Risk Level">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${riskBadgeClass(
                      ap.riskLevel
                    )}`}
                  >
                    {titleCase(ap.riskLevel)}
                  </span>
                </Section>
                <Section title="Primary Concerns">
                  <BulletList items={ap.primaryConcerns} color="blue" />
                </Section>
              </div>

              {ap.immediateAttention?.length > 0 && (
                <Section title="Areas Requiring Immediate Attention">
                  <BulletList items={ap.immediateAttention} color="red" />
                </Section>
              )}

              {ap.riskFactors?.length > 0 && (
                <Section title="Risk Factors">
                  <BulletList items={ap.riskFactors} color="red" />
                </Section>
              )}

              {ap.protectiveFactors?.length > 0 && (
                <Section title="Protective Factors">
                  <BulletList items={ap.protectiveFactors} color="green" />
                </Section>
              )}

              {ap.recommendedInstruments?.length > 0 && (
                <Section title="Recommended Measures">
                  <BulletList items={ap.recommendedInstruments} color="purple" />
                </Section>
              )}

              {ap.clinicalObservations && (
                <Section title="Clinical Observations">
                  <p className="text-gray-700 leading-relaxed">{ap.clinicalObservations}</p>
                </Section>
              )}

              {ap.suggestedNextSteps?.length > 0 && (
                <Section title="Suggested Next Steps">
                  <BulletList items={ap.suggestedNextSteps} color="green" />
                </Section>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No assessment yet.</p>
          ))}

        {/* Diagnostic */}
        {activeTab === "diagnostic" &&
          (dp ? (
            <>
              <Summary envelope={diagnostic} />

              {dp.primaryDiagnosis && (
                <Section title="Primary Diagnosis">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800">{dp.primaryDiagnosis.name}</p>
                        <p className="text-sm text-gray-500">Code: {dp.primaryDiagnosis.code}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        {titleCase(dp.primaryDiagnosis.confidence)} confidence
                      </span>
                    </div>
                    {dp.primaryDiagnosis.rationale && (
                      <p className="text-gray-700 mt-2">{dp.primaryDiagnosis.rationale}</p>
                    )}
                    {dp.primaryDiagnosis.criteriaMet?.length > 0 && (
                      <div className="mt-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Criteria Met</h5>
                        <BulletList items={dp.primaryDiagnosis.criteriaMet} color="blue" />
                      </div>
                    )}
                  </div>
                </Section>
              )}

              {dp.differentials?.length > 0 && (
                <Section title="Differential Diagnoses">
                  <ul className="space-y-2">
                    {dp.differentials.map((d, i) => (
                      <li key={i} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-800">
                            {d.name} <span className="text-xs text-gray-500">({d.code})</span>
                          </span>
                          <span className="text-xs text-gray-500">
                            {titleCase(d.confidence)} confidence
                          </span>
                        </div>
                        {d.rationale && (
                          <p className="text-sm text-gray-700 mt-1">{d.rationale}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {dp.ruleOut?.length > 0 && (
                <Section title="Rule Out">
                  <BulletList items={dp.ruleOut} color="red" />
                </Section>
              )}

              {dp.comorbidities?.length > 0 && (
                <Section title="Comorbidities">
                  <ul className="space-y-2">
                    {dp.comorbidities.map((c, i) => (
                      <li key={i} className="bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium text-gray-800">
                          {c.name} <span className="text-xs text-gray-500">({c.code})</span>
                        </span>
                        {c.rationale && (
                          <p className="text-sm text-gray-700 mt-1">{c.rationale}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {dp.culturalConsiderations?.length > 0 && (
                <Section title="Cultural Considerations">
                  <BulletList items={dp.culturalConsiderations} color="purple" />
                </Section>
              )}

              {dp.clinicalJustification && (
                <Section title="Clinical Justification">
                  <p className="text-gray-700 leading-relaxed">{dp.clinicalJustification}</p>
                </Section>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No diagnostic yet.</p>
          ))}

        {/* Treatment */}
        {activeTab === "treatment" &&
          (tp ? (
            <>
              <Summary envelope={treatment} />

              {tp.approach && (
                <Section title="Approach">
                  <p className="text-gray-700">{tp.approach}</p>
                </Section>
              )}

              {tp.goals?.length > 0 && (
                <Section title="Goals">
                  <ul className="space-y-3">
                    {tp.goals.map((g, i) => (
                      <li key={i} className="bg-gray-50 p-3 rounded-lg">
                        <p className="font-medium text-gray-800">{g.goal}</p>
                        {g.measurable && (
                          <p className="text-sm text-gray-700 mt-1">
                            <span className="text-gray-500">Measurable:</span> {g.measurable}
                          </p>
                        )}
                        {g.targetTimeframe && (
                          <p className="text-sm text-gray-700">
                            <span className="text-gray-500">Timeframe:</span> {g.targetTimeframe}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {tp.interventions?.length > 0 && (
                <Section title="Interventions">
                  <BulletList items={tp.interventions} color="blue" />
                </Section>
              )}

              {tp.homework?.length > 0 && (
                <Section title="Between-session Homework">
                  <BulletList items={tp.homework} color="green" />
                </Section>
              )}

              {tp.referrals?.length > 0 && (
                <Section title="Referrals">
                  <BulletList items={tp.referrals} color="purple" />
                </Section>
              )}

              {tp.reviewCadence && (
                <Section title="Review Cadence">
                  <p className="text-gray-700">{tp.reviewCadence}</p>
                </Section>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No treatment plan yet.</p>
          ))}

        {/* Progress */}
        {activeTab === "progress" &&
          (pp ? (
            <>
              <Summary envelope={progress} />

              {pp.goalProgress?.length > 0 && (
                <Section title="Goal Progress">
                  <ul className="space-y-2">
                    {pp.goalProgress.map((g, i) => (
                      <li key={i} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start gap-3">
                          <span className="text-gray-800">{g.goal}</span>
                          <span
                            className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${goalStatusClass(
                              g.status
                            )}`}
                          >
                            {titleCase(g.status)}
                          </span>
                        </div>
                        {g.notes && <p className="text-sm text-gray-600 mt-1">{g.notes}</p>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {pp.measureInterpretation?.length > 0 && (
                <Section title="Measure Interpretation">
                  <ul className="space-y-2">
                    {pp.measureInterpretation.map((m, i) => (
                      <li key={i} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-800">{m.instrumentId}</span>
                          <span className="text-xs text-gray-500">
                            {titleCase(m.direction)}
                            {m.reliableChange ? " · reliable" : ""}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                          {m.latestScore}
                          {m.previousScore != null && (
                            <span className="text-gray-500"> (was {m.previousScore})</span>
                          )}
                        </p>
                        {m.interpretation && (
                          <p className="text-sm text-gray-700 mt-1">{m.interpretation}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {pp.treatmentEffectiveness && (
                <Section title="Treatment Effectiveness">
                  <p className="text-gray-700 leading-relaxed">{pp.treatmentEffectiveness}</p>
                </Section>
              )}

              {pp.barriers?.length > 0 && (
                <Section title="Barriers">
                  <BulletList items={pp.barriers} color="red" />
                </Section>
              )}

              {pp.recommendations?.length > 0 && (
                <Section title="Recommendations">
                  <BulletList items={pp.recommendations} color="green" />
                </Section>
              )}

              {pp.nextSessionFocus && (
                <Section title="Next Session Focus">
                  <p className="text-gray-700">{pp.nextSessionFocus}</p>
                </Section>
              )}

              {pp.reassessmentRecommended !== undefined && (
                <div
                  className={`p-4 rounded-lg border ${
                    pp.reassessmentRecommended
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <p className="font-medium text-gray-800">
                    {pp.reassessmentRecommended
                      ? "Reassessment Recommended"
                      : "No Reassessment Needed"}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No progress evaluation yet.</p>
          ))}
      </div>
    </div>
  );
}
