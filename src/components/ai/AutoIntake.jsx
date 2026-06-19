"use client";
import { useEffect, useState } from "react";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";
import { Button } from "@/components/ui/button";

// Fires intake (assessment -> diagnostic -> treatment plan) the first time a
// client is viewed without an assessment report, AND only after consent is
// signed or the therapist has recorded an in-person override.
//
// consentStatus prop: if the parent already maintains consent state (e.g.
// ClientDetail), pass it here so this component reacts immediately to changes
// without needing a page reload. Without it, fetches its own copy on mount.
export function AutoIntake({ clientId, onDone, consentStatus: consentProp = null }) {
  const [loaded, setLoaded] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [consent, setConsent] = useState(consentProp);

  // Mirror prop changes into local state so the gate reacts when the parent
  // refreshes consent (e.g. after window focus or tab switch).
  useEffect(() => {
    if (consentProp !== null) setConsent(consentProp);
  }, [consentProp]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const fetches = [
      fetch(`/api/clients/${clientId}/ai-reports?agentType=assessment&limit=1`)
        .then((r) => (r.ok ? r.json() : { reports: [] }))
        .then((data) => (data.reports?.length ?? 0) > 0),
    ];
    // Only fetch consent-status ourselves if the parent isn't providing it.
    if (consentProp === null) {
      fetches.push(
        fetch(`/api/clients/${clientId}/consent-status`).then((r) => (r.ok ? r.json() : null))
      );
    }

    Promise.all(fetches).then(([hasA, consentData]) => {
      if (cancelled) return;
      setHasAssessment(hasA);
      if (consentData !== undefined) setConsent(consentData);
      setLoaded(true);
    }).catch(() => {
      if (!cancelled) setLoaded(true);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
