import { useState, useEffect } from "react";
import { useAIWorkflow } from "@/app/context/AIWorkflowContext";

export default function SessionAIInsights({ session }) {
  const { status, results, activeStage } = useAIWorkflow();
  const [assessmentReport, setAssessmentReport] = useState(null);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [documentationReport, setDocumentationReport] = useState(null);
  const [progressReport, setProgressReport] = useState(null);
  const [treatmentReport, setTreatmentReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("progress");

  useEffect(() => {
    const fetchReports = async () => {
      if (!session?.clientId?._id || !session?._id) return;

      setLoading(true);
      setError(null);
      setAssessmentReport(null);
      setDiagnosticReport(null);
      setDocumentationReport(null);
      setProgressReport(null);
      setTreatmentReport(null);

      try {
        // Fetch session-specific reports
        const sessionResponse = await fetch(
          `/api/clients/${session.clientId._id}/ai-reports?sessionId=${session._id}`
        );
        if (!sessionResponse.ok) {
          throw new Error("Failed to fetch session reports");
        }
        const sessionData = await sessionResponse.json();
        const sessionReports = sessionData.reports || [];

        // Fetch client-level reports
        const clientResponse = await fetch(`/api/clients/${session.clientId._id}/ai-reports`);
        if (!clientResponse.ok) {
          throw new Error("Failed to fetch client reports");
        }
        const clientData = await clientResponse.json();
        const clientReports = clientData.reports || [];

        // Set session-specific reports (get most recent)
        const documentation = sessionReports.find((r) => r.type === "documentation");
        const progress = sessionReports.find((r) => r.type === "progress");
        setDocumentationReport(documentation?.content);
        setProgressReport(progress?.content);

        // Set client-level reports (get most recent)
        const assessment = clientReports.find((r) => r.type === "assessment");
        const diagnostic = clientReports.find((r) => r.type === "diagnostic");
        const treatment = clientReports.find((r) => r.type === "treatment");
        setAssessmentReport(assessment?.content);
        setDiagnosticReport(diagnostic?.content);
        setTreatmentReport(treatment?.content);

        if (!documentation && !progress && !assessment && !diagnostic && !treatment) {
          setError("no_reports");
        }
      } catch (error) {
        console.error("Error fetching reports:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [session]);

  // Update active tab based on AIWorkflow stage
  useEffect(() => {
    if (activeStage) {
      switch (activeStage) {
        case "assessment":
          setActiveTab("assessment");
          break;
        case "diagnostic":
          setActiveTab("diagnostic");
          break;
        case "treatment":
          setActiveTab("treatment");
          break;
        case "progress":
          setActiveTab("progress");
          break;
        case "documentation":
          setActiveTab("documentation");
          break;
        default:
          setActiveTab("progress");
      }
    }
  }, [activeStage]);

  if (loading) return <div className="p-4">Loading insights...</div>;

  if (
    error === "no_reports" ||
    (!assessmentReport &&
      !diagnosticReport &&
      !documentationReport &&
      !progressReport &&
      !treatmentReport)
  ) {
    return (
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-blue-600">
          No AI insights available yet. They will appear here after session is completed.
        </p>
      </div>
    );
  }

  if (error) return <div className="p-4 text-red-500">Error fetching insights: {error}</div>;

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("assessment")}
            className={`flex flex-col items-center p-4 border-b-2 font-medium text-sm ${
              activeTab === "assessment"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-xl mb-1">📊</span>
            <span>Assessment</span>
          </button>
          <button
            onClick={() => setActiveTab("diagnostic")}
            className={`flex flex-col items-center p-4 border-b-2 font-medium text-sm ${
              activeTab === "diagnostic"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-xl mb-1">🔍</span>
            <span>Diagnostic</span>
          </button>
          <button
            onClick={() => setActiveTab("treatment")}
            className={`flex flex-col items-center p-4 border-b-2 font-medium text-sm ${
              activeTab === "treatment"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-xl mb-1">💡</span>
            <span>Treatment</span>
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`flex flex-col items-center p-4 border-b-2 font-medium text-sm ${
              activeTab === "progress"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-xl mb-1">📈</span>
            <span>Progress</span>
          </button>
          <button
            onClick={() => setActiveTab("documentation")}
            className={`flex flex-col items-center p-4 border-b-2 font-medium text-sm ${
              activeTab === "documentation"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className="text-xl mb-1">📝</span>
            <span>Documentation</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {/* Documentation Tab */}
        <div
          className={`${
            activeTab === "documentation" ? "block" : "hidden"
          } bg-white rounded-lg shadow`}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="text-lg font-semibold">Documentation</h3>
                <p className="text-sm text-gray-500">
                  Clinical notes, progress reports, and compliance documentation
                </p>
              </div>
            </div>

            {documentationReport && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold mb-6 text-gray-800">
                    Session Documentation
                  </h3>

                  {/* Summary */}
                {documentationReport.summary && (
                    <div className="mb-8 bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                      <p className="text-gray-600 leading-relaxed">{documentationReport.summary}</p>
                  </div>
                )}

                  {/* SOAP Notes */}
                {documentationReport.soap && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">SOAP Notes</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-700 mb-2">Subjective</h5>
                          <p className="text-gray-600">{documentationReport.soap.subjective}</p>
                      </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-700 mb-2">Objective</h5>
                          <p className="text-gray-600">{documentationReport.soap.objective}</p>
                      </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-700 mb-2">Assessment</h5>
                          <p className="text-gray-600">{documentationReport.soap.assessment}</p>
                      </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h5 className="font-medium text-gray-700 mb-2">Plan</h5>
                          <p className="text-gray-600">{documentationReport.soap.plan}</p>
                      </div>
                    </div>
                  </div>
                )}

                  {/* Clinical Documentation */}
                {documentationReport.clinicalDocumentation && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">
                      Clinical Documentation
                    </h4>

                      {/* Initial Observations */}
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-700 mb-2">Initial Observations</h5>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-600">
                          {documentationReport.clinicalDocumentation.initialObservations}
                        </p>
                      </div>
                      </div>

                      {/* Risk Assessment */}
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-700 mb-2">Risk Assessment</h5>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-600">
                          {documentationReport.clinicalDocumentation.riskAssessmentSummary}
                        </p>
                      </div>
                      </div>

                      {/* Diagnostic Considerations */}
                      <div className="mb-6">
                        <h5 className="font-medium text-gray-700 mb-2">
                          Diagnostic Considerations
                        </h5>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-600">
                          {documentationReport.clinicalDocumentation.diagnosticConsiderations}
                        </p>
                      </div>
                      </div>

                      {/* Treatment Goals & Interventions */}
                      {documentationReport?.clinicalDocumentation?.treatmentGoalsAndInterventions
                        ?.length > 0 && (
                        <div className="mb-6">
                          <h5 className="font-medium text-gray-700 mb-2">
                            Treatment Goals & Interventions
                          </h5>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ul className="space-y-2">
                            {documentationReport.clinicalDocumentation.treatmentGoalsAndInterventions.map(
                                (goal, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">•</span>
                                    <span className="text-gray-600">{goal}</span>
                                  </li>
                              )
                            )}
                          </ul>
                        </div>
                        </div>
                      )}

                      {/* Progress Indicators */}
                      {documentationReport?.clinicalDocumentation?.progressIndicators?.length >
                        0 && (
                        <div className="mb-6">
                          <h5 className="font-medium text-gray-700 mb-2">Progress Indicators</h5>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ul className="space-y-2">
                              {documentationReport.clinicalDocumentation.progressIndicators.map(
                                (indicator, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span className="text-gray-600">{indicator}</span>
                                  </li>
                              )
                            )}
                          </ul>
                    </div>
                  </div>
                )}

                      {/* Treatment Effectiveness */}
                  <div className="mb-6">
                        <h5 className="font-medium text-gray-700 mb-2">Treatment Effectiveness</h5>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-600">
                            {
                              documentationReport.clinicalDocumentation
                                .treatmentEffectivenessAnalysis
                            }
                          </p>
                        </div>
                      </div>

                      {/* Follow-up Recommendations */}
                      {documentationReport?.clinicalDocumentation?.followUpRecommendations?.length >
                        0 && (
                        <div className="mb-6">
                          <h5 className="font-medium text-gray-700 mb-2">
                            Follow-up Recommendations
                          </h5>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ul className="space-y-2">
                              {documentationReport.clinicalDocumentation.followUpRecommendations.map(
                                (recommendation, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-purple-500 mt-1">•</span>
                                    <span className="text-gray-600">{recommendation}</span>
                                  </li>
                              )
                            )}
                          </ul>
                        </div>
                        </div>
                      )}
                  </div>
                )}

                  {/* Progress Summary */}
                  {documentationReport?.progressSummary && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">Progress Summary</h4>

                      {/* Treatment Goals Progress */}
                      {documentationReport?.progressSummary?.treatmentGoalsProgress?.length > 0 && (
                        <div className="mb-6">
                          <h5 className="font-medium text-gray-700 mb-2">
                            Treatment Goals Progress
                          </h5>
                    <div className="space-y-4">
                            {documentationReport.progressSummary.treatmentGoalsProgress.map(
                              (goal, i) => (
                                <div key={i} className="bg-gray-50 p-4 rounded-lg">
                                  <p className="font-medium text-gray-700 mb-2">{goal.goal}</p>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        goal.progress.toLowerCase() === "achieved"
                                          ? "bg-green-100 text-green-800"
                                          : goal.progress.toLowerCase() === "in progress"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {goal.progress}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Areas of Improvement */}
                      {documentationReport?.progressSummary?.areasOfImprovement?.length > 0 && (
                        <div className="mb-6">
                          <h5 className="font-medium text-gray-700 mb-2">Areas of Improvement</h5>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ul className="space-y-2">
                            {documentationReport.progressSummary.areasOfImprovement.map(
                                (area, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-yellow-500 mt-1">•</span>
                                    <span className="text-gray-600">{area}</span>
                                  </li>
                              )
                            )}
                          </ul>
                          </div>
                        </div>
                      )}

                      {/* Challenges and Barriers */}
                      {documentationReport?.progressSummary?.challengesAndBarriers?.length > 0 && (
                        <div className="mb-6">
                          <h5 className="font-medium text-gray-700 mb-2">
                            Challenges and Barriers
                          </h5>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ul className="space-y-2">
                            {documentationReport.progressSummary.challengesAndBarriers.map(
                                (challenge, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-red-500 mt-1">•</span>
                                    <span className="text-gray-600">{challenge}</span>
                                  </li>
                              )
                            )}
                          </ul>
                        </div>
                        </div>
                      )}

                      {/* Treatment Plan Adjustments */}
                      {documentationReport?.progressSummary?.treatmentPlanAdjustments?.length >
                        0 && (
                        <div className="mb-6">
                          <h5 className="font-medium text-gray-700 mb-2">
                            Treatment Plan Adjustments
                          </h5>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ul className="space-y-2">
                              {documentationReport.progressSummary.treatmentPlanAdjustments.map(
                                (adjustment, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-indigo-500 mt-1">•</span>
                                    <span className="text-gray-600">{adjustment}</span>
                                  </li>
                              )
                            )}
                          </ul>
                          </div>
                        </div>
                      )}
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assessment Tab */}
        <div
          className={`${
            activeTab === "assessment" ? "block" : "hidden"
          } bg-white rounded-lg shadow`}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="text-lg font-semibold">Assessment</h3>
                <p className="text-sm text-gray-500">
                  Initial data gathering and organization, basic risk screening, and client history
                  analysis
                </p>
              </div>
            </div>

            {assessmentReport && (
              <div className="space-y-6">
                {/* Summary Section */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                  <p className="text-gray-600 leading-relaxed">{assessmentReport.summary}</p>
                </div>

                {/* Risk Level and Primary Concerns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Risk Level</h4>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl ${getRiskLevelColor(assessmentReport.riskLevel)}`}>
                        {assessmentReport.riskLevel === "low" ? "✅" : "⚠️"}
                      </span>
                      <span
                        className={`text-lg font-medium ${getRiskLevelColor(
                          assessmentReport.riskLevel
                        )}`}
                      >
                          {assessmentReport.riskLevel}
                        </span>
                      </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Primary Concerns</h4>
                    <ul className="space-y-2">
                            {assessmentReport.primaryConcerns.map((concern, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span className="text-gray-600">{concern}</span>
                        </li>
                            ))}
                          </ul>
                        </div>
                </div>

                {/* Risk Factors */}
                {assessmentReport?.riskFactors?.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Risk Factors</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {assessmentReport.riskFactors.map((factor, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span className="text-gray-600">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recommended Assessment Tools */}
                {assessmentReport?.recommendedAssessmentTools?.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Recommended Assessment Tools
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {assessmentReport.recommendedAssessmentTools.map((tool, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-600">{tool}</p>
                        </div>
                            ))}
                    </div>
                        </div>
                      )}

                {/* Clinical Observations */}
                {assessmentReport?.initialClinicalObservations && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Clinical Observations
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-600 leading-relaxed">
                          {assessmentReport.initialClinicalObservations}
                        </p>
                    </div>
                      </div>
                    )}

                {/* Suggested Next Steps */}
                {assessmentReport?.suggestedNextSteps?.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Suggested Next Steps
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                            {assessmentReport.suggestedNextSteps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            <span className="text-gray-600">{step}</span>
                          </li>
                            ))}
                          </ul>
                    </div>
                        </div>
                      )}

                {/* Areas Requiring Immediate Attention */}
                {assessmentReport?.areasRequiringImmediateAttention?.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Areas Requiring Immediate Attention
                    </h4>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                            {assessmentReport.areasRequiringImmediateAttention.map((area, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span className="text-gray-600">{area}</span>
                          </li>
                            ))}
                          </ul>
                    </div>
                        </div>
                      )}
              </div>
            )}
          </div>
        </div>

        {/* Diagnostic Tab */}
        <div
          className={`${
            activeTab === "diagnostic" ? "block" : "hidden"
          } bg-white rounded-lg shadow`}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">🔍</span>
              <div>
                <h3 className="text-lg font-semibold">Diagnostic</h3>
                <p className="text-sm text-gray-500">
                  DSM-5 expertise and analysis, clinical concern identification, and risk factor
                  assessment
                </p>
              </div>
            </div>

            {diagnosticReport && (
              <div className="space-y-6">
                {/* Summary Section */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                  <p className="text-gray-600 leading-relaxed">{diagnosticReport.summary}</p>
                </div>

                {/* Primary Diagnosis */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Primary Diagnosis</h4>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                      <div>
                          <p className="font-medium text-gray-700">
                            {diagnosticReport.primaryDiagnosis.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Code: {diagnosticReport.primaryDiagnosis.code}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          {diagnosticReport.primaryDiagnosis.confidence} confidence
                        </span>
                      </div>
                      <p className="text-gray-600 mt-2">
                        {diagnosticReport.primaryDiagnosis.rationale}
                      </p>
                        </div>

                    {/* Diagnostic Criteria */}
                    {diagnosticReport?.primaryDiagnosis?.criteria?.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">
                          Diagnostic Criteria
                        </h5>
                        <ul className="space-y-2">
                          {diagnosticReport.primaryDiagnosis.criteria.map((criterion, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span className="text-gray-600">{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rule Out Conditions */}
                {diagnosticReport?.ruleOutConditions?.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Rule Out Conditions
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="space-y-2">
                        {diagnosticReport.ruleOutConditions.map((condition, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span className="text-gray-600">{condition}</span>
                          </li>
                            ))}
                          </ul>
                    </div>
                        </div>
                      )}

                {/* Severity and Risk Factors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {diagnosticReport?.severityIndicators?.length > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow-sm">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">
                        Severity Indicators
                      </h4>
                      <ul className="space-y-2">
                            {diagnosticReport.severityIndicators.map((indicator, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">•</span>
                            <span className="text-gray-600">{indicator}</span>
                          </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  {diagnosticReport?.riskFactors?.length > 0 && (
                    <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow-sm">
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Risk Factors</h4>
                      <ul className="space-y-2">
                        {diagnosticReport.riskFactors.map((factor, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span className="text-gray-600">{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommended Assessments */}
                {diagnosticReport?.recommendedAssessments?.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Recommended Assessments
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {diagnosticReport.recommendedAssessments.map((assessment, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-600">{assessment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Justification */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">
                    Clinical Justification
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 leading-relaxed">
                          {diagnosticReport.clinicalJustification}
                        </p>
                      </div>
                </div>

                {/* Treatment Implications */}
                {diagnosticReport?.treatmentImplications?.length > 0 && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Treatment Implications
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {diagnosticReport.treatmentImplications.map((implication, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-600">{implication}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comorbidity Assessment */}
                {diagnosticReport?.comorbidityAssessment && (
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Comorbidity Assessment
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xl ${
                            diagnosticReport.comorbidityAssessment.present
                              ? "text-yellow-500"
                              : "text-green-500"
                          }`}
                        >
                          {diagnosticReport.comorbidityAssessment.present ? "⚠️" : "✅"}
                        </span>
                        <p className="text-gray-600">
                          {diagnosticReport.comorbidityAssessment.present
                            ? "Additional comorbid conditions present"
                            : "No comorbid conditions identified"}
                        </p>
                  </div>
                    </div>
                  </div>
                )}

                {/* Diagnostic Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Diagnostic Summary</h4>
                  <p className="text-gray-600 leading-relaxed">
                    {diagnosticReport.diagnosticSummary}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Treatment Tab */}
        <div
          className={`${activeTab === "treatment" ? "block" : "hidden"} bg-white rounded-lg shadow`}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="text-lg font-semibold">Treatment Plan</h3>
                <p className="text-sm text-gray-500">
                  Treatment plan development, intervention recommendations, and goal setting
                </p>
              </div>
            </div>

            {treatmentReport && (
              <div className="space-y-6">
                {/* Summary Section */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                  <p className="text-gray-600 leading-relaxed">{treatmentReport.summary}</p>
                </div>

                {/* Goals Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Short-term Goals</h4>
                    <ul className="space-y-2">
                      {treatmentReport.goals.shortTerm.map((goal, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span className="text-gray-600">{goal}</span>
                        </li>
                          ))}
                        </ul>
                    </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Long-term Goals</h4>
                    <ul className="space-y-2">
                      {treatmentReport.goals.longTerm.map((goal, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span className="text-gray-600">{goal}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Interventions Section */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Interventions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {treatmentReport.interventions.map((intervention, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-600">{intervention}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline Section */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Treatment Timeline</h4>
                  <div className="space-y-4">
                    {treatmentReport.timeline.map((item, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-24 text-sm font-medium text-gray-500">
                          {item.timeframe}
                        </div>
                        <div className="flex-grow bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-600">{item.milestone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outcomes and Metrics Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Measurable Outcomes
                    </h4>
                    <ul className="space-y-2">
                      {treatmentReport.measurableOutcomes.map((outcome, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-purple-500 mt-1">•</span>
                          <span className="text-gray-600">{outcome}</span>
                        </li>
                          ))}
                        </ul>
                    </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Progress Indicators
                    </h4>
                    <ul className="space-y-2">
                      {treatmentReport.progressIndicators.map((indicator, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span className="text-gray-600">{indicator}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommended Approaches */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">
                        Recommended Approaches
                      </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {treatmentReport.recommendedApproaches.map((approach, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-600">{approach}</p>
                      </div>
                          ))}
                    </div>
                </div>

                {/* Success Metrics and Barriers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Success Metrics</h4>
                    <ul className="space-y-2">
                          {treatmentReport.successMetrics.map((metric, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span className="text-gray-600">{metric}</span>
                        </li>
                          ))}
                        </ul>
                    </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow-sm">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Potential Barriers</h4>
                    <ul className="space-y-2">
                          {treatmentReport.potentialBarriers.map((barrier, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span className="text-gray-600">{barrier}</span>
                        </li>
                          ))}
                        </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Tab */}
        <div
          className={`${activeTab === "progress" ? "block" : "hidden"} bg-white rounded-lg shadow`}
        >
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">📈</span>
              <div>
                <h3 className="text-lg font-semibold">Progress</h3>
                <p className="text-sm text-gray-500">
                  Treatment effectiveness monitoring, goal completion tracking, and pattern
                  recognition
                </p>
              </div>
            </div>

            {progressReport && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold mb-6 text-gray-800">Progress Report</h3>

                  {/* Summary */}
                  {progressReport.summary && (
                    <div className="mb-8 bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-md font-semibold text-gray-700 mb-2">Summary</h4>
                      <p className="text-gray-600 leading-relaxed">{progressReport.summary}</p>
                    </div>
                  )}

                  {/* Metrics */}
                  {progressReport.metrics && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">Progress Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                          <p className="text-2xl font-bold text-blue-700">
                            {progressReport.metrics.overallProgress}%
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-600 mb-1">Symptom Severity</p>
                          <p className="text-2xl font-bold text-green-700">
                            {progressReport.metrics.symptomSeverity}/10
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-600 mb-1">Treatment Adherence</p>
                          <p className="text-2xl font-bold text-yellow-700">
                            {progressReport.metrics.treatmentAdherence}%
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg shadow-sm">
                          <p className="text-sm text-gray-600 mb-1">Risk Level</p>
                          <p className="text-2xl font-bold text-red-700">
                            {progressReport.metrics.riskLevel}/10
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Goal Achievement Status */}
                  {progressReport?.goalAchievementStatus?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">
                        Goal Achievement Status
                      </h4>
                      <div className="space-y-4">
                        {progressReport.goalAchievementStatus.map((goal, i) => (
                          <div key={i} className="bg-gray-50 p-4 rounded-lg">
                            <p className="font-medium text-gray-700 mb-2">{goal.goal}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  goal.status.toLowerCase() === "achieved"
                                    ? "bg-green-100 text-green-800"
                                    : goal.status.toLowerCase() === "in progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                  {goal.status}
                                </span>
                              {goal.notes && <p className="text-sm text-gray-600">{goal.notes}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Observations */}
                  {progressReport?.keyObservations?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">Key Observations</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ul className="space-y-2">
                        {progressReport.keyObservations.map((observation, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              <span className="text-gray-600">{observation}</span>
                            </li>
                        ))}
                      </ul>
                      </div>
                    </div>
                  )}

                  {/* Treatment Effectiveness */}
                  {progressReport.treatmentEffectiveness && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">
                        Treatment Effectiveness
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-600 leading-relaxed">
                          {progressReport.treatmentEffectiveness}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Grid Layout for Multiple Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Identified Barriers */}
                  {progressReport.identifiedBarriers?.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-700 mb-4">
                        Identified Barriers
                      </h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <ul className="space-y-2">
                        {progressReport.identifiedBarriers.map((barrier, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span className="text-gray-600">{barrier}</span>
                              </li>
                        ))}
                      </ul>
                        </div>
                    </div>
                  )}

                  {/* Areas of Improvement */}
                  {progressReport.areasOfImprovement?.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-700 mb-4">
                        Areas of Improvement
                      </h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <ul className="space-y-2">
                        {progressReport.areasOfImprovement.map((area, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-500 mt-1">•</span>
                                <span className="text-gray-600">{area}</span>
                              </li>
                        ))}
                      </ul>
                        </div>
                    </div>
                  )}

                  {/* Areas Needing Focus */}
                    {progressReport?.areasNeedingFocus?.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-700 mb-4">
                        Areas Needing Focus
                      </h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <ul className="space-y-2">
                        {progressReport.areasNeedingFocus.map((area, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-yellow-500 mt-1">•</span>
                                <span className="text-gray-600">{area}</span>
                              </li>
                        ))}
                      </ul>
                        </div>
                    </div>
                  )}

                  {/* Recommendations */}
                    {progressReport?.recommendations?.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-700 mb-4">
                          Recommendations
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <ul className="space-y-2">
                        {progressReport.recommendations.map((recommendation, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                <span className="text-gray-600">{recommendation}</span>
                              </li>
                        ))}
                      </ul>
                        </div>
                    </div>
                  )}
                  </div>

                  {/* Next Steps */}
                  {progressReport.nextSteps?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">Next Steps</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ul className="space-y-2">
                        {progressReport.nextSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-500 mt-1">•</span>
                              <span className="text-gray-600">{step}</span>
                            </li>
                        ))}
                      </ul>
                      </div>
                    </div>
                  )}

                  {/* Treatment Plan Adjustments */}
                  {progressReport.treatmentPlanAdjustments?.length > 0 && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">
                        Treatment Plan Adjustments
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ul className="space-y-2">
                          {progressReport.treatmentPlanAdjustments.map((adjustment, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-indigo-500 mt-1">•</span>
                              <span className="text-gray-600">{adjustment}</span>
                            </li>
                        ))}
                      </ul>
                      </div>
                    </div>
                  )}

                  {/* Reassessment Recommendation */}
                  {progressReport.recommendReassessment !== undefined && (
                    <div className="mb-8">
                      <h4 className="text-md font-semibold text-gray-700 mb-4">
                        Reassessment Recommendation
                      </h4>
                    <div
                        className={`p-4 rounded-lg ${
                        progressReport.recommendReassessment
                          ? "bg-yellow-50 border border-yellow-200"
                          : "bg-green-50 border border-green-200"
                      }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xl ${
                              progressReport.recommendReassessment
                                ? "text-yellow-500"
                                : "text-green-500"
                            }`}
                          >
                            {progressReport.recommendReassessment ? "⚠️" : "✅"}
                          </span>
                          <p className="font-medium text-gray-700">
                        {progressReport.recommendReassessment
                              ? "Reassessment Recommended"
                              : "No Reassessment Needed"}
                          </p>
                        </div>
                      {progressReport.reassessmentRationale && (
                          <p className="text-gray-600 pl-8">
                            {progressReport.reassessmentRationale}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getRiskLevelColor(level) {
  const colors = {
    none: "text-green-600",
    low: "text-blue-600",
    moderate: "text-yellow-600",
    high: "text-orange-600",
    severe: "text-red-600",
  };
  return colors[level?.toLowerCase()] || "text-gray-600";
}

function getProgressStatusColor(status) {
  const colors = {
    completed: "text-green-600",
    "in progress": "text-blue-600",
    "not started": "text-gray-600",
    delayed: "text-yellow-600",
    "needs revision": "text-orange-600",
  };
  return colors[status?.toLowerCase()] || "text-gray-600";
}

function getChangeColor(change) {
  if (change.includes("Improved") || change.includes("Better")) {
    return "text-green-600";
  } else if (change.includes("Worse") || change.includes("Declined")) {
    return "text-red-600";
  } else if (change.includes("No change") || change.includes("Stable")) {
    return "text-blue-600";
  }
  return "text-gray-600";
}
