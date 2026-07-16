"use client";
import { useCallback, useEffect, useState } from "react";
import { MeasureForm } from "./MeasureForm";

const fmt = (d) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/**
 * Risk surfacing for a client (Round 55): shown on the client Overview and
 * the session view.
 *  - Elevated C-SSRS banner: persistent until a NEWER administration lowers
 *    the tier (content-anchored — never expires by time).
 *  - PHQ-9 item-9 trigger banner: clears when a C-SSRS administration exists
 *    after that PHQ-9.
 * Copy discipline: the screener indicates; the clinician decides. Never a
 * diagnosis, instruction, or safe/unsafe verdict.
 */
export function RiskBanners({ clientId, sessionId, refreshKey, onChanged, onOpenSafetyPlan, onLoaded }) {
  const [risk, setRisk] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/clients/${clientId}/risk`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setRisk(data);
          onLoaded?.(data);
        }
      })
      .catch(() => {});
  }, [clientId, onLoaded]);

  useEffect(() => { load(); }, [load, refreshKey]);

  if (!risk) return null;
  const { elevated, cssrs, cssrsSuggested, phq9Date, safetyPlan, screenerId } = risk;
  if (!elevated && !cssrsSuggested) return null;

  const tierLabel = cssrs?.tier === "high" ? "high" : "moderate";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {elevated && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "#FDECEC", border: "1px solid #F5C6C0", borderRadius: 14, padding: "12px 16px" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#C0392B" }}>
              C-SSRS elevated ({tierLabel}) — {fmt(cssrs.date)}
            </div>
            <div style={{ fontSize: 12.5, color: "#8A3A30", marginTop: 2 }}>
              Screener indicates elevated risk — clinical judgment required.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSafetyPlan}
            style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#C0392B", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 15px", borderRadius: 10, flexShrink: 0 }}
          >
            {safetyPlan.exists ? "Open safety plan" : "Create safety plan"}
          </button>
        </div>
      )}
      {cssrsSuggested && (
        <div style={{ background: "#FBF2DA", border: "1px solid #EBD9A0", borderRadius: 14, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240, fontSize: 13, color: "#7A5E17" }}>
              <span style={{ fontWeight: 700, color: "#A9821F" }}>PHQ-9 item 9 was positive on {fmt(phq9Date)}</span>
              {" — "}consider administering the C-SSRS screener.
            </div>
            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#A9821F", color: "#fff", fontWeight: 700, fontSize: 12.5, padding: "8px 15px", borderRadius: 10, flexShrink: 0 }}
            >
              {adminOpen ? "Close" : "Administer C-SSRS"}
            </button>
          </div>
          {adminOpen && (
            <div style={{ marginTop: 12, background: "#fff", border: "1px solid #E9F0F9", borderRadius: 12, padding: "16px 18px" }}>
              <MeasureForm
                clientId={clientId}
                instrumentId={screenerId}
                sessionId={sessionId}
                onSaved={() => {
                  load();
                  onChanged?.();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
