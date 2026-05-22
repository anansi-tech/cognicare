"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";

export default function ReportViewPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch report
        const reportResponse = await fetch(`/api/clients/${params.id}/reports/${params.reportId}`);
        if (!reportResponse.ok) {
          throw new Error("Failed to fetch report");
        }
        const reportData = await reportResponse.json();
        console.log("Report data:", reportData); // Debug log
        setReport(reportData.report);

        // Fetch client information
        const clientResponse = await fetch(`/api/clients/${params.id}`);
        if (!clientResponse.ok) {
          throw new Error("Failed to fetch client information");
        }
        const clientData = await clientResponse.json();
        console.log("Client data:", clientData); // Debug log
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

  const renderAssessmentReport = () => {
    const { content } = report;
    const allAnalyses = content?.aiAnalysis || [];

    return (
      <div className="space-y-6">
        {/* Reports List */}
        {allAnalyses.map((analysis, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Assessment Report #{index + 1}</h2>
              <p className="text-sm text-gray-500">
                {format(new Date(analysis.date), "MMM d, yyyy")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Summary</h3>
                <p className="text-gray-700">{analysis.content?.summary || "N/A"}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Risk Assessment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Risk Level</p>
                    <p className="font-medium">{analysis.content?.riskLevel || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Suicide Risk</p>
                    <p className="font-medium">
                      {client?.riskFactors?.suicideRisk?.level || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Violence Risk</p>
                    <p className="font-medium">{client?.riskFactors?.violence?.risk || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Primary Concerns</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.primaryConcerns?.map((concern, i) => (
                    <li key={i} className="text-gray-700">
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Initial Clinical Observations</h3>
                <p className="text-gray-700">
                  {analysis.content?.initialClinicalObservations || "N/A"}
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Areas Requiring Immediate Attention</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.areasRequiringImmediateAttention?.map((area, i) => (
                    <li key={i} className="text-gray-700">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Recommended Assessment Tools</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.recommendedAssessmentTools?.map((tool, i) => (
                    <li key={i} className="text-gray-700">
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Suggested Next Steps</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.suggestedNextSteps?.map((step, i) => (
                    <li key={i} className="text-gray-700">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDiagnosticReport = () => {
    const { content } = report;
    const allAnalyses = content?.aiAnalysis || [];

    return (
      <div className="space-y-6">
        {/* Reports List */}
        {allAnalyses.map((analysis, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Diagnostic Report #{index + 1}</h2>
              <p className="text-sm text-gray-500">
                {format(new Date(analysis.date), "MMM d, yyyy")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Diagnostic Summary</h3>
                <p className="text-gray-700">{analysis.content?.summary || "N/A"}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Primary Diagnosis</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">
                      {analysis.content?.primaryDiagnosis?.name || "N/A"}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Code: {analysis.content?.primaryDiagnosis?.code || "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Confidence: {analysis.content?.primaryDiagnosis?.confidence || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Diagnostic Criteria</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.primaryDiagnosis?.criteria?.map((criterion, i) => (
                        <li key={i} className="text-gray-700">
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Rationale</h4>
                    <p className="text-gray-700">
                      {analysis.content?.primaryDiagnosis?.rationale || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Differential Diagnoses</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.differentialDiagnoses?.map((diagnosis, i) => (
                    <li key={i} className="text-gray-700">
                      {diagnosis}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Rule Out Conditions</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.ruleOutConditions?.map((condition, i) => (
                    <li key={i} className="text-gray-700">
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Severity Indicators</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.severityIndicators?.map((indicator, i) => (
                    <li key={i} className="text-gray-700">
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Risk Factors</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.riskFactors?.map((factor, i) => (
                    <li key={i} className="text-gray-700">
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Cultural Considerations</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.culturalConsiderations?.map((consideration, i) => (
                    <li key={i} className="text-gray-700">
                      {consideration}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Recommended Assessments</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.recommendedAssessments?.map((assessment, i) => (
                    <li key={i} className="text-gray-700">
                      {assessment}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Clinical Justification</h3>
                <p className="text-gray-700">{analysis.content?.clinicalJustification || "N/A"}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Treatment Implications</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.treatmentImplications?.map((implication, i) => (
                    <li key={i} className="text-gray-700">
                      {implication}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTreatmentReport = () => {
    const { content } = report;
    const allAnalyses = content?.aiAnalysis || [];

    return (
      <div className="space-y-6">
        {/* Reports List */}
        {allAnalyses.map((analysis, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Treatment Report #{index + 1}</h2>
              <p className="text-sm text-gray-500">
                {format(new Date(analysis.date), "MMM d, yyyy")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Treatment Summary</h3>
                <p className="text-gray-700">{analysis.content?.summary || "N/A"}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Treatment Goals</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Short-term Goals</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.goals?.shortTerm?.map((goal, i) => (
                        <li key={i} className="text-gray-700">
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Long-term Goals</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.goals?.longTerm?.map((goal, i) => (
                        <li key={i} className="text-gray-700">
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Interventions</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.interventions?.map((intervention, i) => (
                    <li key={i} className="text-gray-700">
                      {intervention}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Treatment Timeline</h3>
                <div className="space-y-4">
                  {analysis.content?.timeline?.map((item, i) => (
                    <div key={i} className="border-b pb-4 last:border-b-0">
                      <h4 className="font-medium">{item.milestone}</h4>
                      <p className="text-gray-700">Timeframe: {item.timeframe}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Measurable Outcomes</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.measurableOutcomes?.map((outcome, i) => (
                    <li key={i} className="text-gray-700">
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Progress Indicators</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.progressIndicators?.map((indicator, i) => (
                    <li key={i} className="text-gray-700">
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Recommended Approaches</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.recommendedApproaches?.map((approach, i) => (
                    <li key={i} className="text-gray-700">
                      {approach}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Potential Barriers</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.potentialBarriers?.map((barrier, i) => (
                    <li key={i} className="text-gray-700">
                      {barrier}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Success Metrics</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.successMetrics?.map((metric, i) => (
                    <li key={i} className="text-gray-700">
                      {metric}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProgressReport = () => {
    const { content } = report;
    const allAnalyses = content?.aiAnalysis || [];

    return (
      <div className="space-y-6">
        {/* Reports List */}
        {allAnalyses.map((analysis, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Progress Report #{index + 1}</h2>
              <p className="text-sm text-gray-500">
                {format(new Date(analysis.date), "MMM d, yyyy")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Progress Summary</h3>
                <p className="text-gray-700">{analysis.content?.summary || "N/A"}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Overall Progress</p>
                    <p className="font-medium">
                      {analysis.content?.metrics?.overallProgress || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Symptom Severity</p>
                    <p className="font-medium">
                      {analysis.content?.metrics?.symptomSeverity || 0}/10
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Treatment Adherence</p>
                    <p className="font-medium">
                      {analysis.content?.metrics?.treatmentAdherence || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Risk Level</p>
                    <p className="font-medium">{analysis.content?.metrics?.riskLevel || 0}/10</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Goal Achievement Status</h3>
                <div className="space-y-4">
                  {analysis.content?.goalAchievementStatus?.map((goal, i) => (
                    <div key={i} className="border-b pb-4 last:border-b-0">
                      <h4 className="font-medium">{goal.goal}</h4>
                      <p className="text-gray-700">Status: {goal.status}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Key Observations</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.keyObservations?.map((observation, i) => (
                    <li key={i} className="text-gray-700">
                      {observation}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Treatment Effectiveness</h3>
                <p className="text-gray-700">{analysis.content?.treatmentEffectiveness || "N/A"}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Areas of Focus</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Areas of Improvement</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.areasOfImprovement?.map((area, i) => (
                        <li key={i} className="text-gray-700">
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Areas Needing Focus</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.areasNeedingFocus?.map((area, i) => (
                        <li key={i} className="text-gray-700">
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Barriers and Recommendations</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Identified Barriers</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.identifiedBarriers?.map((barrier, i) => (
                        <li key={i} className="text-gray-700">
                          {barrier}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Recommendations</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.recommendations?.map((recommendation, i) => (
                        <li key={i} className="text-gray-700">
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.nextSteps?.map((step, i) => (
                    <li key={i} className="text-gray-700">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Treatment Plan Adjustments</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.content?.treatmentPlanAdjustments?.map((adjustment, i) => (
                    <li key={i} className="text-gray-700">
                      {adjustment}
                    </li>
                  ))}
                </ul>
              </div>

              {analysis.content?.recommendReassessment && (
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4">Reassessment Recommendation</h3>
                  <p className="text-gray-700">
                    {analysis.content?.reassessmentRationale || "N/A"}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDocumentationReport = () => {
    const { content } = report;
    const allAnalyses = content?.aiAnalysis || [];

    return (
      <div className="space-y-6">
        {/* Reports List */}
        {allAnalyses.map((analysis, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Documentation Report #{index + 1}</h2>
              <p className="text-sm text-gray-500">
                {format(new Date(analysis.date), "MMM d, yyyy")}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Session Summary</h3>
                <p className="text-gray-700">{analysis.content?.summary || "N/A"}</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">SOAP Notes</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Subjective</h4>
                    <p className="text-gray-700">{analysis.content?.soap?.subjective || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Objective</h4>
                    <p className="text-gray-700">{analysis.content?.soap?.objective || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Assessment</h4>
                    <p className="text-gray-700">{analysis.content?.soap?.assessment || "N/A"}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Plan</h4>
                    <p className="text-gray-700">{analysis.content?.soap?.plan || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Clinical Documentation</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Initial Observations</h4>
                    <p className="text-gray-700">
                      {analysis.content?.clinicalDocumentation?.initialObservations || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Risk Assessment</h4>
                    <p className="text-gray-700">
                      {analysis.content?.clinicalDocumentation?.riskAssessmentSummary || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Diagnostic Considerations</h4>
                    <p className="text-gray-700">
                      {analysis.content?.clinicalDocumentation?.diagnosticConsiderations || "N/A"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Treatment Goals and Interventions</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.clinicalDocumentation?.treatmentGoalsAndInterventions?.map(
                        (item, i) => (
                          <li key={i} className="text-gray-700">
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Progress Indicators</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.clinicalDocumentation?.progressIndicators?.map(
                        (item, i) => (
                          <li key={i} className="text-gray-700">
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Treatment Effectiveness</h4>
                    <p className="text-gray-700">
                      {analysis.content?.clinicalDocumentation?.treatmentEffectivenessAnalysis ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Follow-up Recommendations</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.clinicalDocumentation?.followUpRecommendations?.map(
                        (item, i) => (
                          <li key={i} className="text-gray-700">
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Progress Summary</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Treatment Goals Progress</h4>
                    <div className="space-y-4">
                      {analysis.content?.progressSummary?.treatmentGoalsProgress?.map((goal, i) => (
                        <div key={i} className="border-b pb-4 last:border-b-0">
                          <h5 className="font-medium">{goal.goal}</h5>
                          <p className="text-gray-700">Status: {goal.progress}</p>
                          {goal.metrics && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">Metrics:</p>
                              <p className="text-gray-700">
                                Current: {goal.metrics.currentScore} / Target:{" "}
                                {goal.metrics.targetScore} ({goal.metrics.progressPercentage})
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Areas of Improvement</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.progressSummary?.areasOfImprovement?.map((item, i) => (
                        <li key={i} className="text-gray-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Challenges and Barriers</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.progressSummary?.challengesAndBarriers?.map((item, i) => (
                        <li key={i} className="text-gray-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Treatment Plan Adjustments</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.progressSummary?.treatmentPlanAdjustments?.map(
                        (item, i) => (
                          <li key={i} className="text-gray-700">
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">Additional Components</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Specific Interventions</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {analysis.content?.additionalComponents?.specificInterventions?.map(
                        (item, i) => (
                          <li key={i} className="text-gray-700">
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Next Session Focus</h4>
                    <p className="text-gray-700">
                      {analysis.content?.additionalComponents?.nextSessionFocus || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReportContent = () => {
    switch (report.type) {
      case "assessment":
        return renderAssessmentReport();
      case "diagnostic":
        return renderDiagnosticReport();
      case "treatment":
        return renderTreatmentReport();
      case "progress":
        return renderProgressReport();
      case "documentation":
        return renderDocumentationReport();
      default:
        return <div className="text-gray-500">Report type not supported</div>;
    }
  };

  const DebugView = () => {
    if (!report) return null;

    return (
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Report Type</h3>
            <pre className="bg-white p-4 rounded overflow-auto">
              {JSON.stringify(report.type, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Report Content</h3>
            <pre className="bg-white p-4 rounded overflow-auto">
              {JSON.stringify(report.content, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Client Information</h3>
            <pre className="bg-white p-4 rounded overflow-auto">
              {JSON.stringify(client, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
            </h1>
            <p className="text-gray-600 mt-1">
              Generated by {report?.content?.metadata?.generatedBy || "Unknown Counselor"}
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
              {format(new Date(report.metadata?.generatedAt || report.createdAt), "PPP")}
            </p>
            <p className="text-sm text-gray-600">
              {format(new Date(report.metadata?.generatedAt || report.createdAt), "p")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Time Period</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(
                new Date(report.metadata?.timeRange?.start || report.startDate),
                "MMM d, yyyy"
              )}{" "}
              - {format(new Date(report.metadata?.timeRange?.end || report.endDate), "MMM d, yyyy")}
            </p>
            <p className="text-sm text-gray-600">
              {Math.round(
                (new Date(report.metadata?.timeRange?.end || report.endDate) -
                  new Date(report.metadata?.timeRange?.start || report.startDate)) /
                  (1000 * 60 * 60 * 24)
              )}{" "}
              days
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{report.status}</p>
            <p className="text-sm text-gray-600">
              Total Reports: {report.content.metadata?.totalReports || 1}
            </p>
          </div>
        </div>

        <div className="prose max-w-none">{renderReportContent()}</div>

        {showDebug && <DebugView />}
      </div>
    </div>
  );
}
