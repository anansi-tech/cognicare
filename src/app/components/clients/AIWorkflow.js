"use client";

import { useState, useEffect } from "react";
import { useAIWorkflow } from "@/app/context/AIWorkflowContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function AIWorkflow({ client, session, updateFunction }) {
  const {
    status,
    setStatus,
    results,
    setResults,
    activeStage,
    setActiveStage,
    error,
    setError,
    updateState,
    resetState,
  } = useAIWorkflow();
  const [reassessmentRecommended, setReassessmentRecommended] = useState(false);
  const [reassessmentRationale, setReassessmentRationale] = useState("");

  // Check if the component is rendered
  useEffect(() => {
    console.log(`AIWorkflow component mounted at ${new Date().toLocaleTimeString()}`, {
      clientId: client?._id,
      sessionId: session?._id,
    });

    // Cleanup function to reset state when component unmounts
    return () => {
      console.log("AIWorkflow component unmounting, resetting state");
      resetState();
    };
  }, []);

  // Check if the client has a reassessment recommendation
  useEffect(() => {
    async function checkForReassessmentRecommendation() {
      if (!client?._id) return;

      try {
        const response = await fetch(`/api/clients/${client._id}/reassessment-status`);
        if (response.ok) {
          const data = await response.json();
          setReassessmentRecommended(data.reassessmentRecommended);
          setReassessmentRationale(data.rationale || "");
        }
      } catch (err) {
        console.error("Error checking reassessment status:", err);
      }
    }

    checkForReassessmentRecommendation();
  }, [client?._id, results]);

  // Trigger different workflow stages
  const triggerWorkflow = async (stage, options = {}) => {
    if (!client?._id) {
      setError("Client information is required");
      return;
    }

    console.log("Starting workflow:", { stage, options });
    updateState({
      status: "loading",
      activeStage: stage,
      error: null,
      results: null,
    });

    try {
      console.log("Triggering workflow:", { stage, options, client, session });
      const response = await fetch("/api/ai/agent-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: stage,
          clientId: client._id,
          clientData: client,
          sessionId: session?._id || null,
          shouldReassess: options.shouldReassess || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Workflow processing failed");
      }

      const data = await response.json();
      console.log("Workflow response:", data);

      // Only call update function if we have a session and it's a post-session workflow
      if (
        updateFunction &&
        typeof updateFunction === "function" &&
        session &&
        stage === "post-session"
      ) {
        console.log("Calling update function to refresh session data...");
        await updateFunction();
      }

      // Now set the results and status
      const newResults = {
        ...data,
        message: data.message || "Workflow completed successfully",
        recommendReassessment: data.recommendReassessment,
        reassessmentRationale: data.reassessmentRationale,
        progressResults: data.progressResults,
        documentationResults: data.documentationResults,
        treatmentResults: data.treatmentResults,
      };
      console.log("Setting results:", newResults);
      updateState({
        results: newResults,
        status: "success",
        activeStage: stage,
      });
    } catch (err) {
      console.error("Workflow error:", err);
      updateState({
        error: err.message,
        status: "error",
      });
    }
  };

  return (
    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">AI Assistant</h3>

      {/* Reassessment Banner */}
      {reassessmentRecommended && !session && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 text-yellow-800 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">Reassessment Recommended</h3>
              <div className="mt-1 text-sm">
                <p>{reassessmentRationale}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <button
          className="w-full bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-4 rounded border border-blue-200"
          onClick={() => triggerWorkflow("intake")}
          disabled={status === "loading"}
        >
          {status === "loading" && activeStage === "intake" ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin h-4 w-4 mr-2 border-2 border-blue-500 rounded-full border-t-transparent"></span>
              Processing...
            </span>
          ) : (
            "Run Initial Assessment"
          )}
        </button>

        {session ? (
          <>
            <button
              className="w-full bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-4 rounded border border-blue-200"
              onClick={() => triggerWorkflow("post-session")}
              disabled={status === "loading" || session.documented}
            >
              {status === "loading" && activeStage === "post-session" ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-blue-500 rounded-full border-t-transparent"></span>
                  Processing...
                </span>
              ) : session.documented ? (
                "Session Already Documented"
              ) : (
                "Process Session Results"
              )}
            </button>
          </>
        ) : (
          <>
            <button
              className="w-full bg-white hover:bg-blue-50 text-blue-700 font-medium py-2 px-4 rounded border border-blue-200"
              onClick={() =>
                triggerWorkflow("pre-session", { shouldReassess: reassessmentRecommended })
              }
              disabled={status === "loading"}
            >
              {status === "loading" && activeStage === "pre-session" ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-blue-500 rounded-full border-t-transparent"></span>
                  Processing...
                </span>
              ) : reassessmentRecommended ? (
                "Prepare Session (with Reassessment)"
              ) : (
                "Prepare for Session"
              )}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm mb-3">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {console.log("Rendering AIWorkflow component:", { status, results, activeStage })}

      {status === "success" && results && (
        <div className="p-3 bg-green-50 text-green-700 rounded text-sm">
          <p className="font-medium">Success!</p>
          <p>{results.message}</p>
          {console.log("Rendering success section:", { status, results, activeStage })}

          {/* Show reassessment recommendation after post-session processing */}
          {results.recommendReassessment !== undefined && (
            <div className="mt-2 pt-2 border-t border-green-200">
              <p className="font-medium">
                {results.recommendReassessment
                  ? "🔔 Reassessment recommended for next session"
                  : "✅ No reassessment needed for next session"}
              </p>
              {results.reassessmentRationale && (
                <p className="mt-1 text-xs">{results.reassessmentRationale}</p>
              )}
            </div>
          )}

          {/* Add links to view AI analysis */}
          {activeStage === "post-session" && (
            <div className="mt-3 pt-2 border-t border-green-200">
              <p className="font-medium mb-2">View AI Analysis:</p>
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    console.log("View AI Analysis clicked");
                    // Refresh the session data first
                    updateFunction();
                    // Scroll to AI Insights section
                    const aiInsightsSection = document.getElementById("ai-insights-section");
                    if (aiInsightsSection) {
                      console.log("Scrolling to AI Insights section");
                      aiInsightsSection.scrollIntoView({ behavior: "smooth" });
                    } else {
                      console.log("AI Insights section not found");
                    }
                  }}
                  className="text-left text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <span className="mr-1">📊</span> View AI Analysis
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click the tab labeled &quot;Progress&quot; or &quot;Documentation&quot; in the AI
                Insights section to view the analysis
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
