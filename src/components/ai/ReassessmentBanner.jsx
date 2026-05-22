"use client";
import { useEffect, useState } from "react";

// Calm informational banner — no button. The next pre-session run already
// reassesses when flagged. Reads /api/clients/[id]/reassessment-status.
export function ReassessmentBanner({ clientId }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetch(`/api/clients/${clientId}/reassessment-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setShow(!!data?.reassessmentRecommended); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clientId]);

  if (!show) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      A reassessment is recommended before the next session.
    </div>
  );
}
