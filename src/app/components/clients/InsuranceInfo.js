"use client";

import { useState } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { DraftRestoredNotice, DraftSaveIndicator } from "@/components/ui/DraftRestoredNotice";

const FIELD_STYLE = {
  marginTop: 1,
  display: "block",
  width: "100%",
  borderRadius: 10,
  border: "1px solid var(--input, #E3ECF7)",
  padding: "9px 12px",
  fontSize: 14,
  color: "#24344F",
  outline: "none",
  fontFamily: "inherit",
};

const LABEL_STYLE = { display: "block", fontSize: 13, fontWeight: 600, color: "#55698F", marginBottom: 4 };

const insuranceDraftValue = (insurance) => ({
  provider: insurance?.provider || "",
  policyNumber: insurance?.policyNumber || "",
  groupNumber: insurance?.groupNumber || "",
  coverage: insurance?.coverage || "full",
  notes: insurance?.notes || "",
});

export default function InsuranceInfo({ client, onUpdate }) {
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [insuranceDraft, setInsuranceDraft] = useState(() => insuranceDraftValue(client?.insurance));
  const { draftRestored, dismissRestored, clearDraft, saveState } = useFormDraft(
    `insurance-draft-${client?._id}`,
    insuranceDraft,
    setInsuranceDraft,
    !!client?._id,
    { serverUpdatedAt: client?.updatedAt }
  );

  const handleEditInsurance = () => setShowInsuranceModal(true);

  const handleInsuranceUpdate = async (formData) => {
    try {
      const response = await fetch(`/api/clients/${client._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insurance: {
            provider: formData.provider,
            policyNumber: formData.policyNumber,
            groupNumber: formData.groupNumber,
            coverage: formData.coverage,
            notes: formData.notes,
          },
        }),
      });
      if (!response.ok) throw new Error("Failed to update insurance information");
      const updatedClient = await response.json();
      clearDraft();
      onUpdate(updatedClient);
      setShowInsuranceModal(false);
    } catch (error) {
      console.error("Error updating insurance:", error);
    }
  };

  const ins = client?.insurance;
  const rows = [
    { k: "Provider", v: ins?.provider },
    { k: "Policy number", v: ins?.policyNumber },
    { k: "Group number", v: ins?.groupNumber },
    { k: "Coverage", v: ins?.coverage === "full" ? "Full coverage" : ins?.coverage === "partial" ? "Partial coverage" : ins?.coverage === "none" ? "No coverage" : ins?.coverage },
    ins?.notes ? { k: "Notes", v: ins.notes } : null,
  ].filter(Boolean);

  return (
    <>
      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 17, letterSpacing: "-.01em", margin: 0, color: "#0B2B6B" }}>Insurance information</h2>
          <button
            onClick={handleEditInsurance}
            style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Edit
          </button>
        </div>
        {ins ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
            {rows.map((r) => (
              <div key={r.k} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, padding: "9px 0", borderTop: "1px solid #F2F6FB" }}>
                <span style={{ fontSize: 13, color: "#8298BC" }}>{r.k}</span>
                <span style={{ fontSize: 13.5, color: "#24344F", fontWeight: 500 }}>{r.v || <span style={{ color: "#A6B8D4" }}>Not set</span>}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>No insurance information has been added yet.</p>
        )}
      </div>

      {/* Insurance Modal */}
      {showInsuranceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, color: "#0B2B6B", margin: "0 0 20px" }}>Edit insurance information</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleInsuranceUpdate(insuranceDraft);
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {draftRestored && (
                  <DraftRestoredNotice
                    onDismiss={dismissRestored}
                    onDiscard={() => { const next = insuranceDraftValue(ins); clearDraft(next); setInsuranceDraft(next); }}
                  />
                )}
                <div>
                  <label style={LABEL_STYLE}>Provider</label>
                  <input type="text" name="provider" value={insuranceDraft.provider} onChange={(e) => setInsuranceDraft((d) => ({ ...d, provider: e.target.value }))} className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Policy number</label>
                  <input type="text" name="policyNumber" value={insuranceDraft.policyNumber} onChange={(e) => setInsuranceDraft((d) => ({ ...d, policyNumber: e.target.value }))} className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Group number</label>
                  <input type="text" name="groupNumber" value={insuranceDraft.groupNumber} onChange={(e) => setInsuranceDraft((d) => ({ ...d, groupNumber: e.target.value }))} className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Coverage</label>
                  <select name="coverage" value={insuranceDraft.coverage} onChange={(e) => setInsuranceDraft((d) => ({ ...d, coverage: e.target.value }))} className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE}>
                    <option value="full">Full coverage</option>
                    <option value="partial">Partial coverage</option>
                    <option value="none">No coverage</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Notes</label>
                  <textarea name="notes" value={insuranceDraft.notes} onChange={(e) => setInsuranceDraft((d) => ({ ...d, notes: e.target.value }))} rows={3} className="focus:ring-2 focus:ring-ring" style={{ ...FIELD_STYLE, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                  <DraftSaveIndicator state={saveState} />
                  <button
                    type="button"
                    onClick={() => { const next = insuranceDraftValue(ins); clearDraft(next); setInsuranceDraft(next); setShowInsuranceModal(false); }}
                    style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#55698F", background: "#F2F6FB", border: "none", borderRadius: 10, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "9px 18px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#2F80FF", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 8px 20px -8px rgba(47,128,255,.7)" }}
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
