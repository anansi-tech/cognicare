"use client";
import { useEnsureWorkflow } from "@/hooks/useEnsureWorkflow";
import { GeneratingState } from "./GeneratingState";
import { Button } from "@/components/ui/button";

// Therapist-controlled intake: shows a "Run intake assessment" button once consent
// is satisfied and no assessment exists yet. Never auto-fires.
export function IntakeAssessment({
  clientId,
  consentStatus,
  assessmentExists,
  onDone,
  onConsentOverridden,
}) {
  const canProcess = consentStatus?.signed || consentStatus?.overridden;

  // shouldRun is always false — therapist triggers via the button (retry/run).
  const { generating, error, retry: run } = useEnsureWorkflow({
    shouldRun: false,
    type: "intake",
    clientId,
    onDone,
  });

  async function recordConsentObtained() {
    const res = await fetch(`/api/clients/${clientId}/consent-status`, { method: "PATCH" });
    if (res.ok) onConsentOverridden?.();
  }

  async function resendConsent() {
    await fetch("/api/consent-forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, type: "general" }),
    });
  }

  if (generating) {
    return <GeneratingState label="Analyzing intake — building assessment, diagnosis, and initial treatment plan…" />;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Couldn&apos;t generate the assessment: {error}</p>
        <Button variant="outline" size="sm" onClick={run}>Try again</Button>
      </div>
    );
  }

  // Still loading consent state
  if (!consentStatus) return null;

  if (!canProcess) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
        <div>
          <p className="text-sm font-medium text-amber-800">Waiting for informed consent</p>
          <p className="text-sm text-amber-700 mt-1">
            The AI clinical pipeline will begin once the client signs, or you can record consent
            obtained in person to proceed immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={recordConsentObtained}>Record consent obtained</Button>
          <Button variant="outline" size="sm" onClick={resendConsent}>Resend consent</Button>
        </div>
      </div>
    );
  }

  // Assessment exists (or still loading) — nothing to show here
  if (assessmentExists !== false) return null;

  return (
    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 space-y-2">
      <p className="text-sm font-medium text-green-900">Ready to generate the clinical picture</p>
      <p className="text-sm text-green-700">
        Administer any baseline measures first, then run the assessment when ready.
      </p>
      <Button size="sm" onClick={run}>Run intake assessment</Button>
    </div>
  );
}
