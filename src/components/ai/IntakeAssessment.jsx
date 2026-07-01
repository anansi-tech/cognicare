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
  latestAssessmentAt,
  notesUpdatedAt,
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
      <div style={{ background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 14, padding: "14px 16px" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#A9821F", margin: 0 }}>Waiting for informed consent</p>
        <p style={{ fontSize: 13.5, color: "#7A6020", marginTop: 4 }}>
          The AI clinical pipeline will begin once the client signs, or you can record consent
          obtained in person to proceed immediately.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={recordConsentObtained}>Record consent obtained</Button>
          <Button variant="outline" size="sm" onClick={resendConsent}>Resend consent</Button>
        </div>
      </div>
    );
  }

  // Notes edited after the last assessment — prompt a re-run (never auto-regenerate).
  const notesStale =
    assessmentExists &&
    notesUpdatedAt &&
    latestAssessmentAt &&
    new Date(notesUpdatedAt) > new Date(latestAssessmentAt);

  if (notesStale) {
    return (
      <div style={{ background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 14, padding: "14px 16px" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#A9821F", margin: "0 0 10px" }}>
          Intake notes changed since the last assessment.
        </p>
        <Button size="sm" variant="outline" onClick={run}>Re-run assessment</Button>
      </div>
    );
  }

  // Assessment exists and notes are current — nothing to show here
  if (assessmentExists !== false) return null;

  return (
    <div style={{ background: "#E7F6EC", border: "1px solid #B7E0C4", borderRadius: 14, padding: "14px 16px" }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#3B9E57", margin: "0 0 4px" }}>Ready to generate the clinical picture</p>
      <p style={{ fontSize: 13.5, color: "#2E7A44", marginBottom: 10 }}>
        Administer any baseline measures first, then run the assessment when ready.
      </p>
      <Button size="sm" onClick={run}>Run intake assessment</Button>
    </div>
  );
}
