"use client";

import { useState, useEffect } from "react";
import { useAIWorkflow } from "@/app/context/AIWorkflowContext";

export default function SessionPrepView({ clientId, sessionId }) {
  const [sessionPrep, setSessionPrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { status, results, activeStage, resetState } = useAIWorkflow();

  useEffect(() => {
    // Only fetch data if we have treatment results from the AI workflow
    if (activeStage === "pre-session" && results?.treatmentResults) {
      setLoading(true);
      setSessionPrep({
        content: results.treatmentResults,
        metadata: {
          timestamp: new Date(),
          modelVersion: "gpt-3.5-turbo",
        },
      });
      setLoading(false);
    } else {
      // Clear the session prep when workflow is not active
      setSessionPrep(null);
      setIsExpanded(false);
    }
  }, [activeStage, results]);

  const handleClear = () => {
    resetState();
    setSessionPrep(null);
    setIsExpanded(false);
  };

  if (loading) {
    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Session Preparation</h3>
        <div className="space-y-4">
          <div className="bg-white p-3 rounded shadow-sm animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 w-full bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="space-y-2">
              <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
              <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 rounded"></div>
              <div className="h-3 w-5/6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Session Preparation</h3>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!sessionPrep) {
    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Session Preparation</h3>
        <p className="text-gray-600">
          Click &quot;Prepare for Session&quot; in the AI Assistant to generate session guidance.
        </p>
      </div>
    );
  }

  const content = sessionPrep.content || {};

  return (
    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Session Preparation</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? "Show Less" : "Show More"}
          </button>
          <button onClick={handleClear} className="text-sm text-red-600 hover:text-red-800">
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Summary - Always visible */}
        {content.summary && (
          <div className="bg-white p-3 rounded shadow-sm">
            <h4 className="font-medium text-blue-700 mb-2">Treatment Summary</h4>
            <p className="text-sm text-gray-700">{content.summary}</p>
          </div>
        )}

        {/* Collapsible content */}
        {isExpanded && (
          <>
            {/* Goals */}
            {content.goals &&
              (content.goals.shortTerm?.length > 0 || content.goals.longTerm?.length > 0) && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <h4 className="font-medium text-blue-700 mb-2">Treatment Goals</h4>
                  {content.goals.shortTerm?.length > 0 && (
                    <>
                      <h5 className="font-medium text-gray-700 text-sm mt-2">Short-term:</h5>
                      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                        {content.goals.shortTerm.map((goal, index) => (
                          <li key={index}>{goal}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {content.goals.longTerm?.length > 0 && (
                    <>
                      <h5 className="font-medium text-gray-700 text-sm mt-2">Long-term:</h5>
                      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                        {content.goals.longTerm.map((goal, index) => (
                          <li key={index}>{goal}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

            {/* Interventions */}
            {content.interventions?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Recommended Interventions</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.interventions.map((intervention, index) => (
                    <li key={index}>{intervention}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Session Focus */}
            {content.sessionFocus && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Session Focus</h4>
                <p className="text-sm text-gray-700">{content.sessionFocus}</p>
              </div>
            )}

            {/* Homework Suggestions */}
            {content.homeworkSuggestions?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Homework Suggestions</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.homeworkSuggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timeline */}
            {content.timeline?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Treatment Timeline</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.timeline.map((item, index) => (
                    <li key={index}>
                      <span className="font-medium">{item.milestone}</span> - {item.timeframe}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Measurable Outcomes */}
            {content.measurableOutcomes?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Measurable Outcomes</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.measurableOutcomes.map((outcome, index) => (
                    <li key={index}>{outcome}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress Indicators */}
            {content.progressIndicators?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Progress Indicators</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.progressIndicators.map((indicator, index) => (
                    <li key={index}>{indicator}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommended Approaches */}
            {content.recommendedApproaches?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Recommended Approaches</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.recommendedApproaches.map((approach, index) => (
                    <li key={index}>{approach}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Potential Barriers */}
            {content.potentialBarriers?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Potential Barriers</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.potentialBarriers.map((barrier, index) => (
                    <li key={index}>{barrier}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Metrics */}
            {content.successMetrics?.length > 0 && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h4 className="font-medium text-blue-700 mb-2">Success Metrics</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {content.successMetrics.map((metric, index) => (
                    <li key={index}>{metric}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        Generated: {new Date(sessionPrep.metadata?.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
