"use client";

import { createContext, useContext, useState, useCallback } from "react";

const AIWorkflowContext = createContext();

export function AIWorkflowProvider({ children }) {
  const [status, setStatus] = useState("idle");
  const [results, setResults] = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [error, setError] = useState(null);

  const updateState = useCallback(
    (newState) => {
      setStatus(newState.status || status);
      setResults(newState.results || results);
      setActiveStage(newState.activeStage || activeStage);
      setError(newState.error || error);
    },
    [status, results, activeStage, error]
  );

  const resetState = useCallback(() => {
    setStatus("idle");
    setResults(null);
    setActiveStage(null);
    setError(null);
  }, []);

  return (
    <AIWorkflowContext.Provider
      value={{
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
      }}
    >
      {children}
    </AIWorkflowContext.Provider>
  );
}

export function useAIWorkflow() {
  const context = useContext(AIWorkflowContext);
  if (!context) {
    throw new Error("useAIWorkflow must be used within an AIWorkflowProvider");
  }
  return context;
}
