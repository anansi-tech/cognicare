"use client";
import { useEffect, useState } from "react";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";
import { Button } from "@/components/ui/button";

// Fires intake (assessment -> diagnostic -> treatment plan) the first time a
// client is viewed without an assessment report, AND only after consent is
// signed or the therapist has recorded an in-person override.
export function AutoIntake({ clientId, onDone }) {
  const [loaded, setLoaded] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [consent, setConsent] = useState(null); // { signed, overridden, latest }

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    Promise.all([
      fetch(`/api/clients/${clientId}/ai-reports?agentType=assessment&limit=1`)
        .then((r) => (r.ok ? r.json() : { reports: [] }))
        .then((data) => (data.reports?.length ?? 0) > 0),
      fetch(`/api/clients/${clientId}/consent-status`)
        .then((r) => (r.ok ? r.json() : null)),
    ]).then(([hasA, consentData]) => {
      if (cancelled) return;
      setHasAssessment(hasA);
      setConsent(consentData);
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });

    return () => { cancelled = true; };
  }, [clientId]);

  const canProcess = consent?.signed || consent?.overridden;

  async function recordConsentObtained() {
    const res = await fetch(`/api/clients/${clientId}/consent-status`, { method: "PATCH" });
    if (res.ok) setConsent((prev) => ({ ...prev, overridden: true }));
  }

  async function resendConsent() {
    await fetch("/api/consent-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, type: "general" }),
    });
  }

  const { generating, error, retry } = useEnsureWorkflow({
    shouldRun: loaded && !hasAssessment && canProcess,
    type: "intake",
    clientId,
    onDone,
  });

  if (!loaded || hasAssessment) return null;

  if (!canProcess) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
        <div>
          <p className="text-sm text-amber-800 font-medium">Waiting for informed consent</p>
          <p className="text-sm text-amber-700 mt-1">
            The AI clinical pipeline will begin once the client signs, or you can record consent
            obtained in person to proceed immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={recordConsentObtained}>
            Record consent obtained
          </Button>
          <Button variant="outline" size="sm" onClick={resendConsent}>
            Resend consent
          </Button>
        </div>
      </div>
    );
  }

  if (error)
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Couldn&apos;t generate the assessment: {error}</p>
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    );

  if (generating)
    return <GeneratingState label="Analyzing intake — building assessment, diagnosis, and initial treatment plan…" />;

  return null;
}
