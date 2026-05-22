"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";

// Renders a compiled Report. Report.content is the array of AIReport envelopes
// gathered by gatherAgentReports (newest first); each entry has summary, payload,
// agentType, createdAt.

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

function Section({ title, children }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
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

function AssessmentBody({ ap }) {
  if (!ap) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
        <Section title="Immediate Attention">
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
          <p className="text-gray-700">{ap.clinicalObservations}</p>
        </Section>
      )}
      {ap.suggestedNextSteps?.length > 0 && (
        <Section title="Suggested Next Steps">
          <BulletList items={ap.suggestedNextSteps} color="green" />
        </Section>
      )}
    </div>
  );
}

function DiagnosticBody({ dp }) {
  if (!dp) return null;
  return (
    <div className="space-y-3">
      {dp.primaryDiagnosis && (
        <Section title="Primary Diagnosis">
          <div className="bg-gray-50 p-3 rounded">
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
              <li key={i} className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-800">
                    {d.name} <span className="text-xs text-gray-500">({d.code})</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {titleCase(d.confidence)} confidence
                  </span>
                </div>
                {d.rationale && <p className="text-sm text-gray-700 mt-1">{d.rationale}</p>}
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
              <li key={i} className="bg-gray-50 p-3 rounded">
                <span className="font-medium text-gray-800">
                  {c.name} <span className="text-xs text-gray-500">({c.code})</span>
                </span>
                {c.rationale && <p className="text-sm text-gray-700 mt-1">{c.rationale}</p>}
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
          <p className="text-gray-700">{dp.clinicalJustification}</p>
        </Section>
      )}
    </div>
  );
}

function TreatmentBody({ tp }) {
  if (!tp) return null;
  return (
    <div className="space-y-3">
      {tp.approach && (
        <Section title="Approach">
          <p className="text-gray-700">{tp.approach}</p>
        </Section>
      )}
      {tp.goals?.length > 0 && (
        <Section title="Goals">
          <ul className="space-y-3">
            {tp.goals.map((g, i) => (
              <li key={i} className="bg-gray-50 p-3 rounded">
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
        <Section title="Homework">
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
    </div>
  );
}

function ProgressBody({ pp }) {
  if (!pp) return null;
  return (
    <div className="space-y-3">
      {pp.goalProgress?.length > 0 && (
        <Section title="Goal Progress">
          <ul className="space-y-2">
            {pp.goalProgress.map((g, i) => (
              <li key={i} className="bg-gray-50 p-3 rounded">
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
              <li key={i} className="bg-gray-50 p-3 rounded">
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
          <p className="text-gray-700">{pp.treatmentEffectiveness}</p>
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
          className={`p-3 rounded border ${
            pp.reassessmentRecommended
              ? "bg-yellow-50 border-yellow-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <p className="font-medium text-gray-800">
            {pp.reassessmentRecommended ? "Reassessment Recommended" : "No Reassessment Needed"}
          </p>
        </div>
      )}
    </div>
  );
}

function DocumentationBody({ doc }) {
  if (!doc) return null;
  return (
    <div className="space-y-3">
      {doc.soap && (
        <Section title="SOAP">
          <dl className="space-y-2">
            {["subjective", "objective", "assessment", "plan"].map((k) =>
              doc.soap[k] ? (
                <div key={k}>
                  <dt className="text-xs font-medium text-gray-500 capitalize">{k}</dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-wrap">{doc.soap[k]}</dd>
                </div>
              ) : null
            )}
          </dl>
        </Section>
      )}
      {doc.measuresAdministered?.length > 0 && (
        <Section title="Measures Administered">
          <ul className="space-y-1">
            {doc.measuresAdministered.map((m, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="font-medium">{m.instrumentId}</span>: {m.score} · {m.severityBand}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {doc.riskStatement && (
        <Section title="Risk Statement">
          <p className="text-gray-700">{doc.riskStatement}</p>
        </Section>
      )}
      {doc.followUp?.length > 0 && (
        <Section title="Follow-up">
          <BulletList items={doc.followUp} color="blue" />
        </Section>
      )}
      {doc.cptHint && (
        <Section title="CPT Hint (advisory)">
          <p className="text-gray-700">{doc.cptHint}</p>
        </Section>
      )}
    </div>
  );
}

function EnvelopeCard({ envelope, agentType, index }) {
  const p = envelope?.payload;
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {titleCase(agentType)} Report #{index + 1}
        </h2>
        {envelope?.createdAt && (
          <p className="text-sm text-gray-500">
            {format(new Date(envelope.createdAt), "MMM d, yyyy")}
          </p>
        )}
      </div>
      {envelope?.summary && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-1">Summary</h3>
          <p className="text-gray-700">{envelope.summary}</p>
        </div>
      )}
      {agentType === "assessment" && <AssessmentBody ap={p} />}
      {agentType === "diagnostic" && <DiagnosticBody dp={p} />}
      {agentType === "treatment" && <TreatmentBody tp={p} />}
      {agentType === "progress" && <ProgressBody pp={p} />}
      {agentType === "documentation" && <DocumentationBody doc={p} />}
    </div>
  );
}

export default function ReportViewPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reportResponse = await fetch(`/api/clients/${params.id}/reports/${params.reportId}`);
        if (!reportResponse.ok) throw new Error("Failed to fetch report");
        const reportData = await reportResponse.json();
        setReport(reportData.report);

        const clientResponse = await fetch(`/api/clients/${params.id}`);
        if (!clientResponse.ok) throw new Error("Failed to fetch client information");
        const clientData = await clientResponse.json();
        setClient(clientData.client);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, params.reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Report not found</div>
      </div>
    );
  }

  // Report.content is Array<AIReport>; bound for safety.
  const envelopes = Array.isArray(report.content) ? report.content : [];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {titleCase(report.type)} Report
            </h1>
            <p className="text-gray-600 mt-1">
              Generated by {report.createdBy?.name ?? "Unknown Counselor"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z"
                  clipRule="evenodd"
                />
              </svg>
              Print Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Client</p>
            <p className="text-lg font-semibold text-gray-900">
              {client?.name || "Unknown Client"}
            </p>
            <p className="text-sm text-gray-600">
              {client?.age || "N/A"} years old • {client?.gender || "N/A"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Report Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(report.createdAt), "PPP")}
            </p>
            <p className="text-sm text-gray-600">{format(new Date(report.createdAt), "p")}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Time Period</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(report.startDate), "MMM d, yyyy")} -{" "}
              {format(new Date(report.endDate), "MMM d, yyyy")}
            </p>
            <p className="text-sm text-gray-600">
              {Math.round(
                (new Date(report.endDate) - new Date(report.startDate)) / (1000 * 60 * 60 * 24)
              )}{" "}
              days
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{report.status}</p>
            <p className="text-sm text-gray-600">Total entries: {envelopes.length}</p>
          </div>
        </div>

        {envelopes.length === 0 ? (
          <p className="text-gray-500">
            No agent outputs were found for the selected date range.
          </p>
        ) : (
          <div className="space-y-6">
            {envelopes.map((env, i) => (
              <EnvelopeCard
                key={env._id ?? i}
                envelope={env}
                agentType={env.agentType ?? report.type}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
