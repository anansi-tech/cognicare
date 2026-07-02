"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

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

const PM_LABEL = { cash: "Cash", check: "Check", credit: "Credit Card", insurance: "Insurance", other: "Other" };

export default function BillingInfo({ client, onUpdate, onDelete }) {
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(null);
  const [invoices, setInvoices] = useState([]);

  const refreshInvoices = async () => {
    try {
      const res = await fetch(`/api/clients/${client._id}/billing`);
      if (!res.ok) return;
      const data = await res.json();
      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (e) {
      console.error("Failed to load invoices", e);
    }
  };

  useEffect(() => {
    if (client?._id) refreshInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?._id]);

  const handleEditBilling = () => setShowBillingModal(true);

  const handleBillingUpdate = async (formData) => {
    try {
      const response = await fetch(`/api/clients/${client._id}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: formData.paymentMethod,
          rate: parseFloat(formData.rate) || 0,
          initialRate: parseFloat(formData.initialRate) || 0,
          groupRate: parseFloat(formData.groupRate) || 0,
          notes: formData.notes,
        }),
      });
      if (!response.ok) throw new Error("Failed to update billing information");
      const updatedBilling = await response.json();
      onUpdate({ ...client, billing: updatedBilling });
      setShowBillingModal(false);
    } catch (error) {
      console.error("Error updating billing:", error);
      toast.error("Failed to update billing");
    }
  };

  const handleViewInvoice = (invoice) => {
    if (invoice.document) window.open(invoice.document, "_blank");
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/${invoiceId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete invoice");
      await refreshInvoices();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await fetch(`/api/sessions?clientId=${client._id}`);
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const s = await response.json();
      setSessions(s);
      return s;
    } catch (error) {
      console.error("Error fetching sessions:", error);
      alert("Failed to load sessions");
      return null;
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!client.billing?.rate) { alert("Please set a session rate first"); return; }
    setIsGenerating(true);
    try {
      const s = await fetchSessions();
      if (!s || s.length === 0) { alert("No sessions available to invoice"); return; }
      setShowSessionModal(true);
    } catch (error) {
      console.error("Error generating invoice:", error);
      alert("Failed to load sessions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSessionSelection = async () => {
    if (selectedSessions.length === 0) { alert("Please select at least one session"); return; }
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessions: selectedSessions.map((session) => ({
            ...session,
            rate: session.type === "initial"
              ? client.billing.initialRate || client.billing.rate
              : session.type === "group"
                ? client.billing.groupRate || client.billing.rate
                : client.billing.rate,
          })),
          notes: "Automatically generated invoice",
        }),
      });
      if (!response.ok) throw new Error("Failed to generate invoice");
      const data = await response.json();
      await refreshInvoices();
      if (data.documentUrl) window.open(data.documentUrl, "_blank");
      setShowSessionModal(false);
      setSelectedSessions([]);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId, paymentMethod) => {
    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paymentDate: new Date().toISOString(), paymentMethod }),
      });
      if (!response.ok) throw new Error("Failed to mark invoice as paid");
      await refreshInvoices();
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error("Failed to mark invoice as paid");
    }
  };

  const handleSendReminder = async (invoiceId) => {
    try {
      const response = await fetch(`/api/clients/${client._id}/invoices/${invoiceId}/reminder`, { method: "POST" });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to send reminder");
      }
      alert("Reminder sent successfully");
    } catch (error) {
      console.error("Error sending reminder:", error);
      alert(error.message || "Failed to send reminder");
    }
  };

  const renderPaymentDropdown = (invoice) => {
    if (invoice.status === "paid") return null;
    const methods = ["cash", "check", "credit", "insurance", "other"];
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowPaymentDropdown(showPaymentDropdown === invoice._id ? null : invoice._id)}
          style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", background: "#2F80FF", padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, transition: "opacity .13s" }}
        >
          Mark as paid ▾
        </button>
        {showPaymentDropdown === invoice._id && (
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", width: 160, background: "#fff", border: "1px solid #E3ECF7", borderRadius: 12, boxShadow: "0 8px 24px -8px rgba(11,43,107,.3)", zIndex: 10, overflow: "hidden" }}>
            {methods.map((m) => (
              <button
                key={m}
                onClick={() => { handleMarkAsPaid(invoice._id, m); setShowPaymentDropdown(null); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, color: "#24344F", border: "none", background: "transparent", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F9FE"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {PM_LABEL[m]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const billing = client?.billing;
  const rateCards = [
    { label: "Payment method", value: billing ? (PM_LABEL[billing.paymentMethod] ?? billing.paymentMethod ?? "—") : null, isMoney: false },
    { label: "Standard rate", value: billing?.rate ? `$${billing.rate}` : null, isMoney: true },
    { label: "Initial rate", value: billing?.initialRate ? `$${billing.initialRate}` : null, isMoney: true },
    { label: "Group rate", value: billing?.groupRate ? `$${billing.groupRate}` : null, isMoney: true },
  ];

  const hasInvoices = invoices.length > 0 && invoices.some((inv) => inv.amount);

  return (
    <>
      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", padding: "22px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 17, letterSpacing: "-.01em", margin: 0, color: "#0B2B6B" }}>Billing information</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={handleEditBilling} style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {billing ? "Edit billing" : "Add billing information"}
            </button>
            {billing && (
              <>
                <button onClick={handleGenerateInvoice} disabled={isGenerating} style={{ fontSize: 13, fontWeight: 600, color: "#158A98", background: "none", border: "none", cursor: isGenerating ? "default" : "pointer", padding: 0, opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? "Generating…" : "Generate invoice"}
                </button>
                <button onClick={onDelete} style={{ fontSize: 13, fontWeight: 600, color: "#C0392B", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Delete billing
                </button>
              </>
            )}
          </div>
        </div>

        {billing ? (
          <>
            {/* Rate grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {rateCards.map((c) => (
                <div key={c.label} style={{ background: "#F7FAFE", border: "1px solid #EEF3FA", borderRadius: 13, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", color: "#8298BC", textTransform: "uppercase" }}>{c.label}</div>
                  {c.value ? (
                    c.isMoney ? (
                      <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontSize: 18, fontWeight: 700, color: "#0B2B6B", marginTop: 4 }}>{c.value}</div>
                    ) : (
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#0B2B6B", marginTop: 5 }}>{c.value}</div>
                    )
                  ) : (
                    <div style={{ fontSize: 13.5, color: "#A6B8D4", marginTop: 5 }}>Not set</div>
                  )}
                </div>
              ))}
            </div>

            {/* Invoices */}
            {hasInvoices && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "#7C93B8", textTransform: "uppercase", margin: "20px 0 10px" }}>Recent invoices</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {invoices.map((invoice) => {
                    const isPaid = invoice.status === "paid";
                    return (
                      <div
                        key={invoice._id}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, border: "1px solid #E7EEF7", borderRadius: 13, padding: "13px 16px", transition: "background .13s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F9FE"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0B2B6B" }}>#{invoice.invoiceNumber || invoice._id.toString().slice(-6)}</span>
                          <span style={{ fontSize: 12.5, color: "#8298BC" }}>{new Date(invoice.date).toLocaleDateString()}</span>
                          <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontSize: 15, fontWeight: 700, color: "#0B2B6B" }}>${invoice.amount}</span>
                          <span style={{ fontSize: 12, color: "#8298BC", textTransform: "capitalize" }}>
                            {invoice.paymentMethod === "credit" ? "credit card" : invoice.paymentMethod || "not specified"}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, background: isPaid ? "#E7F6EC" : "#FBF2DA", color: isPaid ? "#3B9E57" : "#A9821F" }}>
                            {isPaid ? "Paid" : "Pending"}
                          </span>
                          {!isPaid && (
                            <button onClick={() => handleSendReminder(invoice._id)} style={{ fontSize: 12, fontWeight: 600, color: "#8298BC", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                              Send reminder
                            </button>
                          )}
                          {renderPaymentDropdown(invoice)}
                          {invoice.document && (
                            <a href={invoice.document} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", textDecoration: "none" }}>
                              View PDF
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(invoice._id)}
                            style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, color: "#A6B8D4", background: "none", border: "none", cursor: "pointer", transition: "all .13s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#EAF3FF"; e.currentTarget.style.color = "#2F80FF"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#A6B8D4"; }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>No billing information has been added yet.</p>
        )}
      </div>

      {/* Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", maxWidth: 540, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, color: "#0B2B6B", margin: "0 0 20px" }}>Edit billing information</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                handleBillingUpdate({ paymentMethod: fd.get("paymentMethod"), rate: fd.get("rate"), initialRate: fd.get("initialRate"), groupRate: fd.get("groupRate"), notes: fd.get("notes") });
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={LABEL_STYLE}>Payment method</label>
                  <select name="paymentMethod" defaultValue={billing?.paymentMethod} className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE}>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="credit">Credit Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Standard session rate</label>
                  <input type="number" name="rate" defaultValue={billing?.rate} placeholder="Standard session rate" className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Initial session rate</label>
                  <input type="number" name="initialRate" defaultValue={billing?.initialRate} placeholder="Initial consultation rate" className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Group session rate</label>
                  <input type="number" name="groupRate" defaultValue={billing?.groupRate} placeholder="Group session rate" className="focus:ring-2 focus:ring-ring" style={FIELD_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Billing notes</label>
                  <textarea name="notes" defaultValue={billing?.notes} rows={3} className="focus:ring-2 focus:ring-ring" style={{ ...FIELD_STYLE, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                  <button type="button" onClick={() => setShowBillingModal(false)} style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#55698F", background: "#F2F6FB", border: "none", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
                  <button type="submit" style={{ padding: "9px 18px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#2F80FF", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 8px 20px -8px rgba(47,128,255,.7)" }}>Save changes</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Selection Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", maxWidth: 600, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, color: "#0B2B6B", margin: "0 0 16px" }}>Select sessions for invoice</h2>
            {isLoadingSessions ? (
              <p style={{ fontSize: 13, color: "#8298BC", margin: "32px 0", textAlign: "center" }}>Loading sessions…</p>
            ) : (
              <div style={{ overflowY: "auto", maxHeight: 360, display: "flex", flexDirection: "column", gap: 8 }}>
                {sessions.map((session) => {
                  const checked = selectedSessions.some((s) => s._id === session._id);
                  const rate = session.type === "initial"
                    ? billing?.initialRate || billing?.rate
                    : session.type === "group"
                      ? billing?.groupRate || billing?.rate
                      : billing?.rate;
                  return (
                    <label
                      key={session._id}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "1px solid #E7EEF7", borderRadius: 12, cursor: "pointer", background: checked ? "#EAF3FF" : "#fff", transition: "background .13s" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedSessions([...selectedSessions, session]);
                          else setSelectedSessions(selectedSessions.filter((s) => s._id !== session._id));
                        }}
                        style={{ width: 16, height: 16, accentColor: "#2F80FF" }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0B2B6B" }}>{new Date(session.date).toLocaleDateString()}</span>
                        <span style={{ fontSize: 12, color: "#8298BC", marginLeft: 10 }}>{session.type ? session.type.charAt(0).toUpperCase() + session.type.slice(1) : "Standard"} · {session.duration || "60"} min</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#0B2B6B" }}>${rate}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #F2F6FB" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0B2B6B" }}>
                Total: ${selectedSessions.reduce((sum, s) => {
                  const r = s.type === "initial" ? billing?.initialRate || billing?.rate : s.type === "group" ? billing?.groupRate || billing?.rate : billing?.rate;
                  return sum + (r || 0);
                }, 0)}
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => { setShowSessionModal(false); setSelectedSessions([]); }} style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#55698F", background: "#F2F6FB", border: "none", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSessionSelection} disabled={isGenerating || selectedSessions.length === 0} style={{ padding: "9px 18px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#2F80FF", border: "none", borderRadius: 10, cursor: isGenerating || selectedSessions.length === 0 ? "not-allowed" : "pointer", opacity: isGenerating || selectedSessions.length === 0 ? 0.6 : 1, boxShadow: "0 8px 20px -8px rgba(47,128,255,.7)" }}>
                  {isGenerating ? "Generating…" : "Generate invoice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
