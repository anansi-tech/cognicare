"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";

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

function AssessmentBody({ p }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Section title="Risk Level">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${riskBadgeClass(
              p.riskLevel
            )}`}
          >
            {titleCase(p.riskLevel)}
          </span>
        </Section>
        <Section title="Primary Concerns">
          <BulletList items={p.primaryConcerns} color="blue" />
        </Section>
      </div>
      {p.immediateAttention?.length > 0 && (
        <Section title="Immediate Attention">
          <BulletList items={p.immediateAttention} color="red" />
        </Section>
      )}
      {p.riskFactors?.length > 0 && (
        <Section title="Risk Factors">
          <BulletList items={p.riskFactors} color="red" />
        </Section>
      )}
      {p.protectiveFactors?.length > 0 && (
        <Section title="Protective Factors">
          <BulletList items={p.protectiveFactors} color="green" />
        </Section>
      )}
      {p.recommendedInstruments?.length > 0 && (
        <Section title="Recommended Measures">
          <BulletList items={p.recommendedInstruments} color="purple" />
        </Section>
      )}
      {p.clinicalObservations && (
        <Section title="Clinical Observations">
          <p className="text-gray-700">{p.clinicalObservations}</p>
        </Section>
      )}
      {p.suggestedNextSteps?.length > 0 && (
        <Section title="Suggested Next Steps">
          <BulletList items={p.suggestedNextSteps} color="green" />
        </Section>
      )}
    </div>
  );
}

function DiagnosticBody({ p }) {
  return (
    <div className="space-y-3">
      {p.primaryDiagnosis && (
        <Section title="Primary Diagnosis">
          <div className="bg-gray-50 p-3 rounded">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-gray-800">{p.primaryDiagnosis.name}</p>
                <p className="text-sm text-gray-500">Code: {p.primaryDiagnosis.code}</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {titleCase(p.primaryDiagnosis.confidence)} confidence
              </span>
            </div>
            {p.primaryDiagnosis.rationale && (
              <p className="text-gray-700 mt-2">{p.primaryDiagnosis.rationale}</p>
            )}
            {p.primaryDiagnosis.criteriaMet?.length > 0 && (
              <div className="mt-3">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Criteria Met</h5>
                <BulletList items={p.primaryDiagnosis.criteriaMet} color="blue" />
              </div>
            )}
          </div>
        </Section>
      )}
      {p.differentials?.length > 0 && (
        <Section title="Differential Diagnoses">
          <ul className="space-y-2">
            {p.differentials.map((d, i) => (
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
      {p.ruleOut?.length > 0 && (
        <Section title="Rule Out">
          <BulletList items={p.ruleOut} color="red" />
        </Section>
      )}
      {p.comorbidities?.length > 0 && (
        <Section title="Comorbidities">
          <ul className="space-y-2">
            {p.comorbidities.map((c, i) => (
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
      {p.culturalConsiderations?.length > 0 && (
        <Section title="Cultural Considerations">
          <BulletList items={p.culturalConsiderations} color="purple" />
        </Section>
      )}
      {p.clinicalJustification && (
        <Section title="Clinical Justification">
          <p className="text-gray-700">{p.clinicalJustification}</p>
        </Section>
      )}
    </div>
  );
}

function TreatmentBody({ p }) {
  return (
    <div className="space-y-3">
      {p.approach && (
        <Section title="Approach">
          <p className="text-gray-700">{p.approach}</p>
        </Section>
      )}
      {p.goals?.length > 0 && (
        <Section title="Goals">
          <ul className="space-y-3">
            {p.goals.map((g, i) => (
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
      {p.interventions?.length > 0 && (
        <Section title="Interventions">
          <BulletList items={p.interventions} color="blue" />
        </Section>
      )}
      {p.homework?.length > 0 && (
        <Section title="Homework">
          <BulletList items={p.homework} color="green" />
        </Section>
      )}
      {p.referrals?.length > 0 && (
        <Section title="Referrals">
          <BulletList items={p.referrals} color="purple" />
        </Section>
      )}
      {p.reviewCadence && (
        <Section title="Review Cadence">
          <p className="text-gray-700">{p.reviewCadence}</p>
        </Section>
      )}
    </div>
  );
}

function ProgressBody({ p }) {
  return (
    <div className="space-y-3">
      {p.goalProgress?.length > 0 && (
        <Section title="Goal Progress">
          <ul className="space-y-2">
            {p.goalProgress.map((g, i) => (
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
      {p.measureInterpretation?.length > 0 && (
        <Section title="Measure Interpretation">
          <ul className="space-y-2">
            {p.measureInterpretation.map((m, i) => (
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
      {p.treatmentEffectiveness && (
        <Section title="Treatment Effectiveness">
          <p className="text-gray-700">{p.treatmentEffectiveness}</p>
        </Section>
      )}
      {p.barriers?.length > 0 && (
        <Section title="Barriers">
          <BulletList items={p.barriers} color="red" />
        </Section>
      )}
      {p.recommendations?.length > 0 && (
        <Section title="Recommendations">
          <BulletList items={p.recommendations} color="green" />
        </Section>
      )}
      {p.nextSessionFocus && (
        <Section title="Next Session Focus">
          <p className="text-gray-700">{p.nextSessionFocus}</p>
        </Section>
      )}
      {p.reassessmentRecommended !== undefined && (
        <div
          className={`p-3 rounded border ${
            p.reassessmentRecommended
              ? "bg-yellow-50 border-yellow-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <p className="font-medium text-gray-800">
            {p.reassessmentRecommended ? "Reassessment Recommended" : "No Reassessment Needed"}
          </p>
        </div>
      )}
    </div>
  );
}

function DocumentationBody({ p }) {
  return (
    <div className="space-y-3">
      {p.soap && (
        <Section title="SOAP">
          <dl className="space-y-2">
            {["subjective", "objective", "assessment", "plan"].map((k) =>
              p.soap[k] ? (
                <div key={k}>
                  <dt className="text-xs font-medium text-gray-500 capitalize">{k}</dt>
                  <dd className="text-sm text-gray-700 whitespace-pre-wrap">{p.soap[k]}</dd>
                </div>
              ) : null
            )}
          </dl>
        </Section>
      )}
      {p.measuresAdministered?.length > 0 && (
        <Section title="Measures Administered">
          <ul className="space-y-1">
            {p.measuresAdministered.map((m, i) => (
              <li key={i} className="text-sm text-gray-700">
                <span className="font-medium">{m.instrumentId}</span>: {m.score} · {m.severityBand}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {p.riskStatement && (
        <Section title="Risk Statement">
          <p className="text-gray-700">{p.riskStatement}</p>
        </Section>
      )}
      {p.followUp?.length > 0 && (
        <Section title="Follow-up">
          <BulletList items={p.followUp} color="blue" />
        </Section>
      )}
      {p.cptHint && (
        <Section title="CPT Hint (advisory)">
          <p className="text-gray-700">{p.cptHint}</p>
        </Section>
      )}
    </div>
  );
}

const BODIES = {
  assessment: AssessmentBody,
  diagnostic: DiagnosticBody,
  treatment: TreatmentBody,
  progress: ProgressBody,
  documentation: DocumentationBody,
};

export default function AIReportPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/clients/${params.id}/ai-reports/${params.reportId}`);
        if (!res.ok) {
          throw new Error((await res.json()).error ?? "Failed to fetch report");
        }
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
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

  const Body = BODIES[report.agentType];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {titleCase(report.agentType)} Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(report.createdAt), "PPP 'at' p")}
              {report.counselorId?.name && <> · by {report.counselorId.name}</>}
            </p>
          </div>
        </div>

        {report.summary && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h2 className="text-sm font-medium text-gray-700 mb-1">Summary</h2>
            <p className="text-gray-700">{report.summary}</p>
          </div>
        )}

        {Body ? (
          <Body p={report.payload ?? {}} />
        ) : (
          <pre className="bg-gray-50 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(report.payload, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
