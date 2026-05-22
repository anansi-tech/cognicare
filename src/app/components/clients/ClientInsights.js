import { useState, useEffect } from "react";

export default function ClientInsights({ clientId }) {
  const [assessmentReport, setAssessmentReport] = useState(null);
  const [diagnosticReport, setDiagnosticReport] = useState(null);
  const [treatmentReport, setTreatmentReport] = useState(null);
  const [progressReport, setProgressReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      setAssessmentReport(null);
      setDiagnosticReport(null);
      setTreatmentReport(null);
      setProgressReport(null);

      try {
        const response = await fetch(`/api/clients/${clientId}/ai-reports`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("no_reports");
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to fetch insights");
          }
          return;
        }

        const data = await response.json();
        console.log("AI reports response:", data);

        const reports = data.reports || [];

        // Find the most recent report of each type
        const assessment = reports
          .filter((r) => r.type === "assessment")
          .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp))[0];
        const diagnostic = reports
          .filter((r) => r.type === "diagnostic")
          .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp))[0];
        const treatment = reports
          .filter((r) => r.type === "treatment")
          .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp))[0];
        const progress = reports
          .filter((r) => r.type === "progress")
          .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp))[0];

        setAssessmentReport(assessment);
        setDiagnosticReport(diagnostic);
        setTreatmentReport(treatment);
        setProgressReport(progress);

        if (!assessment && !diagnostic && !treatment && !progress) {
          setError("no_reports");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchInsights();
    }
  }, [clientId]);

  if (loading) {
    return (
      <div className="p-4 text-gray-600 flex items-center gap-2">
        <span className="animate-spin">⏳</span> Loading insights...
      </div>
    );
  }

  if (
    error === "no_reports" ||
    (!assessmentReport && !diagnosticReport && !treatmentReport && !progressReport)
  ) {
    return (
      <div className="bg-blue-100 p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <div>
            <h3 className="font-medium text-blue-700">No insights yet!</h3>
            <p className="text-blue-700 text-sm mt-1">
              To get started, go to the <strong>AI Assistant</strong> tab and click{" "}
              <strong>Run Initial Assessment</strong>. This will analyze the client information and
              generate AI insights.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              const currentUrl = window.location.pathname;
              window.location.href = `${currentUrl}?tab=ai-assistant`;
            }}
            className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Go to AI Assistant
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

  const assessmentContent = assessmentReport?.content;
  const diagnosticContent = diagnosticReport?.content;
  const treatmentContent = treatmentReport?.content;
  const progressContent = progressReport?.content;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("overview")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "overview"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("assessments")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "assessments"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Assessment
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "diagnostics"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Diagnostic
        </button>
        <button
          onClick={() => setActiveTab("treatment")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "treatment"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Treatment
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "progress"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Progress
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <span className="text-xl text-blue-500">📊</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Overall Progress</h3>
                  <p className="text-xl font-semibold text-blue-600">
                    {progressContent?.metrics?.overallProgress || "N/A"}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-lg shadow-sm border border-yellow-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <span className="text-xl text-yellow-500">⚠️</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Risk Level</h3>
                  <p className="text-xl font-semibold text-yellow-600">
                    {assessmentContent?.riskLevel || "N/A"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg shadow-sm border border-green-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <span className="text-xl text-green-500">✅</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Treatment Adherence</h3>
                  <p className="text-xl font-semibold text-green-600">
                    {progressContent?.metrics?.treatmentAdherence || "N/A"}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg shadow-sm border border-purple-100 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <span className="text-xl text-purple-500">🎯</span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Goals Achieved</h3>
                  <p className="text-xl font-semibold text-purple-600">
                    {progressContent?.goalAchievementStatus?.filter((g) => g.status === "Achieved")
                      .length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Current Status Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-xl">🌡️</span> Current Status
            </h3>
            <div className="space-y-4">
              {/* Primary Diagnosis */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-blue-700 mb-1">Primary Diagnosis</h4>
                    <p className="text-gray-700">
                      {diagnosticContent?.primaryDiagnosis?.name || "Not available"}
                    </p>
                    {diagnosticContent?.primaryDiagnosis?.code && (
                      <p className="text-sm text-gray-500">
                        Code: {diagnosticContent.primaryDiagnosis.code}
                      </p>
                    )}
                  </div>
                  {diagnosticContent?.primaryDiagnosis?.confidence && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        diagnosticContent.primaryDiagnosis.confidence === "high"
                          ? "bg-green-100 text-green-800"
                          : diagnosticContent.primaryDiagnosis.confidence === "moderate"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {diagnosticContent.primaryDiagnosis.confidence.charAt(0).toUpperCase() +
                        diagnosticContent.primaryDiagnosis.confidence.slice(1)}{" "}
                      Confidence
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-700 mb-1">Primary Concerns</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {assessmentContent?.primaryConcerns?.map((concern, index) => (
                        <li key={index}>{concern}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-700 mb-1">Latest Progress</h4>
                    <p className="text-sm text-gray-700">
                      {progressContent?.progressSummary || "No recent progress updates"}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <h4 className="font-medium text-yellow-700 mb-1">Areas Needing Focus</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {progressContent?.areasNeedingFocus?.map((area, index) => (
                        <li key={index}>{area}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-700 mb-1">Recent Achievements</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {progressContent?.goalAchievementStatus
                        ?.filter((g) => g.status === "Achieved")
                        .slice(0, 2)
                        .map((goal, index) => (
                          <li key={index}>{goal.goal}</li>
                        ))}
                      {(!progressContent?.goalAchievementStatus ||
                        progressContent.goalAchievementStatus.filter((g) => g.status === "Achieved")
                          .length === 0) && <li>No recent achievements</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Treatment Plan Overview */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-xl">📋</span> Treatment Plan Overview
          </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Current Interventions</h4>
                <div className="space-y-2">
                  {treatmentContent?.interventions?.slice(0, 3).map((intervention, index) => (
                    <div key={index} className="bg-blue-50 p-2 rounded-lg">
                      <p className="text-sm text-gray-700">{intervention}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Upcoming Goals</h4>
                <div className="space-y-2">
                  {treatmentContent?.goals?.shortTerm?.slice(0, 3).map((goal, index) => (
                    <div key={index} className="bg-green-50 p-2 rounded-lg">
                      <p className="text-sm text-gray-700">{goal}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "assessments" && assessmentContent && (
        <div className="bg-white shadow-lg rounded-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Assessment Report</h3>
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {formatDate(assessmentReport?.metadata?.timestamp)}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Summary Section */}
            <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> Assessment Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{assessmentContent.summary}</p>
            </div>

            {/* Risk Level Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">⚠️</span> Risk Level
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      assessmentContent.riskLevel === "low"
                        ? "bg-green-100 text-green-800"
                        : assessmentContent.riskLevel === "moderate"
                        ? "bg-yellow-100 text-yellow-800"
                        : assessmentContent.riskLevel === "high"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {assessmentContent.riskLevel.charAt(0).toUpperCase() +
                      assessmentContent.riskLevel.slice(1)}{" "}
                    Risk
                  </div>
                </div>

                {assessmentContent.riskFactors && assessmentContent.riskFactors.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h4 className="text-sm font-medium text-red-700 mb-2">
                      Identified Risk Factors
                    </h4>
                    <ul className="space-y-2 text-red-700">
                      {assessmentContent.riskFactors.map((factor, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-red-500"></span>
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Concerns Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🔍</span> Primary Concerns
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessmentContent.primaryConcerns?.map((concern, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-700">{concern}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Assessment Tools Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🛠️</span> Recommended Assessment Tools
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assessmentContent.recommendedAssessmentTools?.map((tool, index) => (
                  <div key={index} className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-gray-700">{tool}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Observations Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📝</span> Clinical Observations
              </h3>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {assessmentContent.initialClinicalObservations}
              </p>
            </div>

            {/* Suggested Next Steps Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">➡️</span> Suggested Next Steps
              </h3>
              <div className="space-y-3">
                {assessmentContent.suggestedNextSteps?.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                    <span className="text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas Requiring Immediate Attention Section */}
            {assessmentContent.areasRequiringImmediateAttention?.length > 0 && (
              <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-100">
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">🚨</span> Areas Requiring Immediate Attention
                </h3>
                <div className="space-y-3">
                  {assessmentContent.areasRequiringImmediateAttention.map((area, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-red-500"></span>
                      <span className="text-red-700">{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "diagnostics" && diagnosticContent && (
        <div className="bg-white shadow-lg rounded-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Diagnostic Report</h3>
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {formatDate(diagnosticReport?.metadata?.timestamp)}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Summary Section */}
            <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> Diagnostic Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{diagnosticContent.diagnosticSummary}</p>
            </div>

            {/* Primary Diagnosis Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🔍</span> Primary Diagnosis
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
                  <div>
                    <h4 className="text-lg font-medium text-gray-800">
                      {diagnosticContent.primaryDiagnosis.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      Code: {diagnosticContent.primaryDiagnosis.code}
                    </p>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      diagnosticContent.primaryDiagnosis.confidence === "high"
                        ? "bg-green-100 text-green-800"
                        : diagnosticContent.primaryDiagnosis.confidence === "moderate"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {diagnosticContent.primaryDiagnosis.confidence.charAt(0).toUpperCase() +
                      diagnosticContent.primaryDiagnosis.confidence.slice(1)}{" "}
                    Confidence
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Diagnostic Criteria</h4>
                    <ul className="space-y-2 text-gray-700">
                      {diagnosticContent.primaryDiagnosis.criteria.map((criterion, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                          <span>{criterion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Clinical Rationale</h4>
                    <p className="text-gray-700">{diagnosticContent.primaryDiagnosis.rationale}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Factors Section */}
            {diagnosticContent.riskFactors && diagnosticContent.riskFactors.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span> Risk Factors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagnosticContent.riskFactors.map((factor, index) => (
                    <div key={index} className="bg-red-50 p-4 rounded-lg">
                      <p className="text-red-700">{factor}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rule Out Conditions Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">❌</span> Rule Out Conditions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagnosticContent.ruleOutConditions.map((condition, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{condition}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Indicators Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📊</span> Severity Indicators
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagnosticContent.severityIndicators.map((indicator, index) => (
                  <div key={index} className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-gray-700">{indicator}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatment Implications Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">💡</span> Treatment Implications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {diagnosticContent.treatmentImplications.map((implication, index) => (
                  <div key={index} className="bg-green-50 p-4 rounded-lg">
                    <p className="text-gray-700">{implication}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Justification Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📝</span> Clinical Justification
              </h3>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {diagnosticContent.clinicalJustification}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "treatment" && !treatmentContent && (
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛠️</span>
            <div>
              <h3 className="font-medium text-blue-700">No treatment plan available</h3>
              <p className="text-blue-700 text-sm mt-1">
                To generate a treatment plan, go to the <strong>AI Assistant</strong> tab and click{" "}
                <strong>Prepare for Session</strong>.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                const currentUrl = window.location.pathname;
                window.location.href = `${currentUrl}?tab=ai-assistant`;
              }}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              Go to AI Assistant
            </button>
          </div>
        </div>
      )}

      {activeTab === "treatment" && treatmentContent && (
        <div className="bg-white shadow-lg rounded-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Treatment Plan</h3>
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {formatDate(treatmentReport?.metadata?.timestamp)}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Summary Section */}
            <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> Treatment Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{treatmentContent.summary}</p>
            </div>

            {/* Goals Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">🎯</span> Short-term Goals
                </h3>
                <ul className="space-y-3">
                  {treatmentContent.goals?.shortTerm?.map((goal, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-700">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {treatmentContent.goals?.longTerm?.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-xl">🌟</span> Long-term Goals
                  </h3>
                  <ul className="space-y-3">
                    {treatmentContent.goals.longTerm.map((goal, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                        <span className="text-gray-700">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Interventions Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🛠️</span> Interventions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {treatmentContent.interventions?.map((intervention, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-700">{intervention}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📅</span> Treatment Timeline
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                <div className="space-y-6 pl-8">
                  {treatmentContent.timeline?.map((item, index) => (
                    <div key={index} className="relative">
                      <div className="absolute -left-8 top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium text-gray-800">{item.milestone}</p>
                        <p className="text-sm text-gray-500 mt-1">{item.timeframe}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Outcomes and Metrics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">📊</span> Measurable Outcomes
                </h3>
                <ul className="space-y-3">
                  {treatmentContent.measurableOutcomes?.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-700">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">📈</span> Progress Indicators
                </h3>
                <ul className="space-y-3">
                  {treatmentContent.progressIndicators?.map((indicator, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                      <span className="text-gray-700">{indicator}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Approaches and Barriers Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">💡</span> Recommended Approaches
                </h3>
                <div className="space-y-3">
                  {treatmentContent.recommendedApproaches?.map((approach, index) => (
                    <div key={index} className="bg-green-50 p-3 rounded-lg">
                      <p className="text-gray-700">{approach}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="text-xl">⚠️</span> Potential Barriers
                </h3>
                <div className="space-y-3">
                  {treatmentContent.potentialBarriers?.map((barrier, index) => (
                    <div key={index} className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-gray-700">{barrier}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Success Metrics Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">✅</span> Success Metrics
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {treatmentContent.successMetrics?.map((metric, index) => (
                  <div key={index} className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-gray-700">{metric}</p>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        )}

      {activeTab === "progress" && !progressContent && (
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h3 className="font-medium text-blue-700">No progress data available</h3>
              <p className="text-blue-700 text-sm mt-1">
                To generate progress insights, go to the <strong>AI Assistant</strong> tab and click{" "}
                <strong>Process Session Results</strong>.
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                const currentUrl = window.location.pathname;
                window.location.href = `${currentUrl}?tab=ai-assistant`;
              }}
              className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              Go to AI Assistant
            </button>
            </div>
          </div>
        )}

      {activeTab === "progress" && progressContent && (
        <div className="bg-white shadow-lg rounded-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Progress Report</h3>
              <p className="text-sm text-gray-500 mt-2">
                Last updated: {formatDate(progressReport?.metadata?.timestamp)}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Summary Section */}
            <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> Progress Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{progressContent.summary}</p>
            </div>

            {/* Metrics Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📊</span> Progress Metrics
            </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Overall Progress</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {progressContent.metrics.overallProgress}%
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Symptom Severity</h4>
                  <p className="text-2xl font-bold text-yellow-600">
                    {progressContent.metrics.symptomSeverity}/10
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Treatment Adherence</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {progressContent.metrics.treatmentAdherence}%
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Risk Level</h4>
                  <p className="text-2xl font-bold text-red-600">
                    {progressContent.metrics.riskLevel}/10
                  </p>
                </div>
              </div>
            </div>

            {/* Goal Achievement Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🎯</span> Goal Achievement Status
              </h3>
              <div className="space-y-4">
                {progressContent.goalAchievementStatus.map((goal, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="text-gray-700 font-medium">{goal.goal}</p>
                        <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                            goal.status === "Achieved"
                              ? "bg-green-100 text-green-800"
                              : goal.status === "In Progress"
                            ? "bg-blue-100 text-blue-800"
                            : goal.status === "On track"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {goal.status}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
                      </div>

            {/* Key Observations Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🔍</span> Key Observations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {progressContent.keyObservations.map((observation, index) => (
                  <div key={index} className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-gray-700">{observation}</p>
                    </div>
                  ))}
                </div>
            </div>

            {/* Treatment Effectiveness Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">💡</span> Treatment Effectiveness
              </h3>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                  {progressContent.treatmentEffectiveness}
                </p>
            </div>

            {/* Areas of Improvement Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📈</span> Areas of Improvement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {progressContent.areasOfImprovement.map((area, index) => (
                  <div key={index} className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-gray-700">{area}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas Needing Focus Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">⚠️</span> Areas Needing Focus
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {progressContent.areasNeedingFocus.map((area, index) => (
                  <div key={index} className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-gray-700">{area}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">✅</span> Recommendations
              </h3>
              <div className="space-y-3">
                {progressContent.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-green-500"></span>
                    <span className="text-gray-700">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">➡️</span> Next Steps
              </h3>
              <div className="space-y-3">
                {progressContent.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></span>
                    <span className="text-gray-700">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Treatment Plan Adjustments Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🔄</span> Treatment Plan Adjustments
              </h3>
              <div className="space-y-3">
                {progressContent.treatmentPlanAdjustments.map((adjustment, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-purple-500"></span>
                    <span className="text-gray-700">{adjustment}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reassessment Section */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">📝</span> Reassessment Status
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      progressContent.recommendReassessment
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {progressContent.recommendReassessment
                      ? "Reassessment Recommended"
                      : "No Reassessment Needed"}
                  </span>
                </div>
                <p className="text-gray-700">{progressContent.reassessmentRationale}</p>
              </div>
            </div>
          </div>
        </div>
      )}
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

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}
