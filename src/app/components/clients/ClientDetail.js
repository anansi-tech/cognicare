"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ConsentMarkdown } from "@/components/ai/ConsentMarkdown";
import toast from "react-hot-toast";
import ClientForm from "./ClientForm";
import ClientInsights from "./ClientInsights";
import ClientAnalytics from "./ClientAnalytics";
import ReassignControl from "./ReassignControl";
import { ageFromDob, formatDob, genderLabel } from "@/lib/age";
import { MeasuresPanel } from "@/components/measures/MeasuresPanel";
import { AdministrationHistory } from "@/components/measures/AdministrationHistory";
import { listInstruments } from "@/lib/mbc/instruments";
import { useLiam } from "@/components/liam/LiamProvider";
import { IntakeAssessment } from "@/components/ai/IntakeAssessment";
import { ReassessmentBanner } from "@/components/ai/ReassessmentBanner";
import {
  getConsentFormTemplate,
  getAvailableTemplates,
} from "@/lib/templates/consentFormTemplate";
import BillingInfo from "./BillingInfo";
import InsuranceInfo from "./InsuranceInfo";
import {
  ClipboardDocumentIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { createPortal } from "react-dom";
import { Spinner } from "@/components/ui/Spinner";
import { avatarColors, initials } from "@/lib/avatar";

/** Compact one-line score summary per instrument, shown on Overview post-intake. */
function MeasureGlance({ clientId, onViewAssessments }) {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    fetch("/api/instruments")
      .then((r) => r.json())
      .then((list) =>
        Promise.all(
          list.map((i) =>
            fetch(`/api/clients/${clientId}/measures?instrumentId=${i.id}`)
              .then((r) => r.json())
              .then((t) => ({ ...t, shortName: i.shortName ?? i.id.toUpperCase() }))
          )
        )
      )
      .then((trends) => setScores(trends.filter((t) => t.points?.length > 0)));
  }, [clientId]);

  if (scores.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
      {scores.map((t) => {
        const arrow = t.delta == null ? null : t.delta > 0 ? "↑" : t.delta < 0 ? "↓" : "→";
        const arrowColor =
          t.direction === "improved" ? "#3B9E57"
          : t.direction === "worsened" ? "#C0392B"
          : "#8298BC";
        const pct = t.percentageFactor ? ` (${t.latest * t.percentageFactor}%)` : "";
        const band = t.points.at(-1)?.band ?? "";
        return (
          <div key={t.instrumentId} style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 14, padding: "10px 14px", minWidth: 140 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8298BC" }}>{t.shortName}</div>
            <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, color: "#0B2B6B", lineHeight: 1.15, marginTop: 2 }}>
              {t.latest}{pct}
            </div>
            <div style={{ fontSize: 12.5, color: "#55698F", marginTop: 2 }}>
              {band}
              {arrow && <span style={{ marginLeft: 6, color: arrowColor }}>{arrow}</span>}
            </div>
          </div>
        );
      })}
      <button
        onClick={onViewAssessments}
        style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", alignSelf: "center" }}
        className="hover:text-primary/70 transition-colors"
      >
        View assessments →
      </button>
    </div>
  );
}

function sortSessionsForDisplay(list) {
  const now = Date.now();
  const upcoming = list
    .filter((s) => new Date(s.date).getTime() >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = list
    .filter((s) => new Date(s.date).getTime() < now)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return [...upcoming, ...past];
}

export default function ClientDetail({ clientId }) {
  const [client, setClient] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [selectedConsentType, setSelectedConsentType] = useState("");
  const [consentFormContent, setConsentFormContent] = useState("");
  const [consentFormNotes, setConsentFormNotes] = useState("");
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showNewClientReminder, setShowNewClientReminder] = useState(false);
  const [aiRefreshKey, setAiRefreshKey] = useState(0);
  const [consentForms, setConsentForms] = useState([]);
  const [consentStatus, setConsentStatus] = useState(null);
  const [administeredInstruments, setAdministeredInstruments] = useState([]);
  const [assessmentExists, setAssessmentExists] = useState(null); // null = loading
  const [latestAssessmentAt, setLatestAssessmentAt] = useState(null);
  const [latestBaselineAt, setLatestBaselineAt] = useState(null);
  const [counselor, setCounselor] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bindClient, setOpen: setLiamOpen } = useLiam();

  // Bind LIAM to this client so Ask LIAM / Cmd-K consults this record.
  useEffect(() => {
    if (!clientId) return;
    bindClient(clientId, client?.name ?? "");
  }, [clientId, client?.name, bindClient]);

  useEffect(() => {
    // Check sessionStorage for the flag on initial load
    const newClientId = sessionStorage.getItem("showClientReminderForId");
    if (newClientId && newClientId === clientId) {
      setShowNewClientReminder(true);
      // Immediately remove the flag so it doesn't show again
      sessionStorage.removeItem("showClientReminderForId");
    }

    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  // Sync activeTab with the URL ?tab= param. Runs on mount AND when the
  // param changes mid-session (e.g. the ReassessmentBanner pushes
  // ?tab=progress while the user is already on the client page).
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) return;
    // Map removed tabs to their new homes.
    const TAB_ALIAS = { insights: "overview", analytics: "progress", measures: "progress", assessments: "progress" };
    const resolved = TAB_ALIAS[tabParam] ?? tabParam;
    if (
      ["overview", "sessions", "reports", "progress", "consent-billing"].includes(resolved)
    ) {
      setActiveTab(resolved);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "sessions" && clientId) fetchClientSessions();
  }, [activeTab, clientId]);

  useEffect(() => {
    setAvailableTemplates(getAvailableTemplates());
  }, []);

  // Consent forms now live in their own model (Round 12). Fetch them
  // separately from the client doc.
  const refreshConsentForms = async () => {
    if (!clientId) return;
    try {
      const [formsRes, statusRes] = await Promise.all([
        fetch(`/api/consent-forms?clientId=${clientId}`),
        fetch(`/api/clients/${clientId}/consent-status`),
      ]);
      if (formsRes.ok) {
        const data = await formsRes.json();
        setConsentForms(Array.isArray(data) ? data : []);
      }
      if (statusRes.ok) setConsentStatus(await statusRes.json());
    } catch (e) {
      console.error("Failed to load consent forms", e);
    }
  };

  useEffect(() => {
    refreshConsentForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Refetch consent when the Consent tab is opened — catches portal-signed forms
  // without a full page reload.
  useEffect(() => {
    if (activeTab === "consent-billing") refreshConsentForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Refetch consent on window focus — catches the "signed in another tab, came back" case.
  // Don't attach while the edit form is open: the refetch isn't useful there and
  // a stale background refresh could (in a future refactor) replace the client object.
  useEffect(() => {
    if (isEditing) return;
    const handleFocus = () => refreshConsentForms();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, isEditing]);

  // Auto-dismiss the new-client banner once consent is resolved.
  useEffect(() => {
    if (consentStatus?.signed || consentStatus?.overridden) {
      setShowNewClientReminder(false);
    }
  }, [consentStatus]);

  // Track which baseline instruments have been administered (PHQ-9, GAD-7).
  const refreshAdministeredInstruments = useCallback(async () => {
    if (!clientId) return;
    try {
      const all = listInstruments();
      const trends = await Promise.all(
        all.map((i) =>
          fetch(`/api/clients/${clientId}/measures?instrumentId=${i.id}`)
            .then((r) => r.ok ? r.json() : { points: [] })
        )
      );
      setAdministeredInstruments(
        all.map((i) => i.id).filter((_, idx) => (trends[idx].points?.length ?? 0) > 0)
      );
      const baselineMs = trends
        .flatMap((t) => t.points ?? [])
        .filter((p) => p.isBaseline)
        .reduce((m, p) => Math.max(m, new Date(p.date).getTime()), 0);
      setLatestBaselineAt(baselineMs > 0 ? new Date(baselineMs).toISOString() : null);
    } catch {}
  }, [clientId]);

  useEffect(() => { refreshAdministeredInstruments(); }, [refreshAdministeredInstruments]);

  // Track whether the intake assessment has been run; used for the baseline card + IntakeAssessment.
  const refreshAssessment = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await fetch(`/api/clients/${clientId}/ai-reports?agentType=assessment&limit=1`).then((r) => r.ok ? r.json() : { reports: [] });
      const latest = data.reports?.[0];
      setAssessmentExists(!!latest);
      setLatestAssessmentAt(latest?.createdAt ?? null);
    } catch {}
  }, [clientId]);

  useEffect(() => { refreshAssessment(); }, [refreshAssessment]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching client data for:", clientId);
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch client");
      }

      const data = await response.json();
      console.log("Client data received:", data);

      setClient(data.client);
      setCounselor(data.counselor || null);
      setAttendance(data.attendance || null);
      setRecentSessions(data.recentSessions || []);
      setRecentReports(data.recentReports || []);
    } catch (err) {
      console.error("Error fetching client:", err);
      setError(err.message || "Error loading client");
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/reports`);
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await response.json();
      setRecentReports(data.reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const fetchClientSessions = async () => {
    try {
      const r = await fetch(`/api/sessions?clientId=${clientId}`);
      if (!r.ok) return;
      const data = await r.json();
      setSessions(sortSessionsForDisplay(data));
    } catch {
      // non-critical — tab will show empty
    }
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
    fetchClient();
  };

  const handleDeleteClient = async () => {
    if (!confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete client");
      }

      router.push("/clients");
    } catch (err) {
      console.error("Error deleting client:", err);
      setError(err.message || "Error deleting client");
      setLoading(false);
    }
  };

  const getReportTitle = (report) => {
    const label = report.type ?? "clinical";
    const type = label.charAt(0).toUpperCase() + label.slice(1);
    const date = formatDate(report.createdAt);
    return `${type} Report - ${date}`;
  };

  const handleViewReport = (report) => {
    router.push(`/clients/${clientId}/reports/${report._id}/view`);
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${clientId}/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete report");
      }

      // Refresh the reports list
      fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      alert("Failed to delete report. Please try again.");
    }
  };

  const handleBillingUpdate = (updatedClient) => {
    setClient(updatedClient);
  };

  const handleDeleteBilling = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all billing information? This will also delete all invoices."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${client._id}/billing`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete billing information");
      }

      // Update the client state by removing the billing information
      setClient((prevClient) => ({
        ...prevClient,
        billing: null,
      }));
    } catch (error) {
      console.error("Error deleting billing:", error);
      // Handle error (show toast, etc.)
    }
  };

  const handleViewConsent = (form) => {
    setSelectedConsent(form);
    setShowConsentModal(true);
  };

  const handleConsentTypeChange = (e) => {
    const type = e.target.value;
    setSelectedConsentType(type);

    // Only try to get template if a type is selected
    if (type) {
      try {
        const template = getConsentFormTemplate(type);
        setConsentFormContent(template.content);
      } catch (error) {
        console.error("Error loading template:", error);
        setConsentFormContent("");
      }
    } else {
      // Reset version when no type is selected
      setConsentFormContent("");
    }
  };

  const handleRequestConsent = async (e) => {
    e.preventDefault();

    if (!selectedConsentType) {
      toast.error("Please select a consent type");
      return;
    }

    const toastId = toast.loading("Requesting consent...");

    try {
      const response = await fetch("/api/consent-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client._id,
          type: selectedConsentType,
          notes: consentFormNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create consent form");
      }

      const newConsentData = await response.json();

      if (
        !newConsentData ||
        !newConsentData.newConsentForm ||
        !newConsentData.newConsentForm.token
      ) {
        throw new Error("API did not return the expected consent form data with a token.");
      }

      // Refresh consent forms list from the model-backed endpoint.
      await refreshConsentForms();

      // Construct the shareable link
      const shareableLink = `${window.location.origin}/client-portal/consent/${newConsentData.newConsentForm.token}`;

      // Reset form state
      setSelectedConsentType("");
      setConsentFormContent("");
      setConsentFormNotes("");
      setShowConsentModal(false);

      // Show success toast with the link and copy button
      toast.success(
        (t) => (
          <span className="flex flex-col items-start">
            <span>{client?.contactInfo?.email ? "Consent form created and emailed to the client." : "Consent form created. No email on file — use the share/copy link to send it."}</span>
            <span className="text-xs mt-1">Shareable Link:</span>
            <div className="flex items-center space-x-2 mt-1 w-full">
              <input
                type="text"
                readOnly
                value={shareableLink}
                className="flex-1 text-xs border rounded px-1 py-0.5 bg-gray-100 w-full"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareableLink);
                  toast.success("Link copied!", { id: "copy-toast" });
                }}
                className="p-1 bg-accent text-accent-foreground rounded hover:bg-accent/90"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 self-end"
            >
              Dismiss
            </button>
          </span>
        ),
        {
          id: toastId,
          duration: 15000,
        }
      );
    } catch (error) {
      console.error("Error creating consent form:", error);
      toast.error(`Failed to create consent form: ${error.message}`, {
        id: toastId,
      });
    }
  };

  const handleDeleteConsent = async (formId, e) => {
    e.stopPropagation(); // Prevent opening the view modal
    if (!formId) {
      console.error("No form ID provided");
      return;
    }

    if (!confirm("Are you sure you want to delete this consent form?")) return;

    try {
      const response = await fetch(`/api/consent-forms/${formId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete consent form");
      }
      await refreshConsentForms();
    } catch (error) {
      console.error("Error deleting consent form:", error);
      alert(error.message || "Failed to delete consent form");
    }
  };

  const handleResendConsent = async (formId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/consent-forms/${formId}/resend`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend consent form");
      toast.success("Fresh signing link emailed to the client.");
      await refreshConsentForms();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleClientUpdate = (updatedClient) => {
    setClient(updatedClient);
  };

  const dismissNewClientReminder = () => {
    setShowNewClientReminder(false);
    // No need to modify URL params here anymore
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Spinner size={40} />
        <p style={{ fontSize: 13.5, color: "#8298BC" }}>Loading client…</p>
      </div>
    );
  }

  if (error && error !== "no_reports") {
    return (
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "16px 20px", color: "#B91C1C", fontSize: 14 }}>
        <strong>Error: </strong>{error}
      </div>
    );
  }

  if (!client) {
    return (
      <div style={{ background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 14, padding: "16px 20px", color: "#A9821F", fontSize: 14 }}>
        <strong>Warning: </strong>Client not found
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>Client</p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.025em", margin: "6px 0 24px", color: "#0B2B6B" }}>
          Edit {client.name}
        </h1>
        <ClientForm
          client={client}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div>
      {/* New Client Reminder Banner */}
      {showNewClientReminder && (
        <div style={{ marginBottom: 16, background: "#EEF4FB", border: "1px solid #CBE0F8", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13.5, color: "#0B2B6B" }}>
            {client?.contactInfo?.email
              ? "✨ Client created. A consent form has been emailed to the client — the AI pipeline will begin once it’s signed, or you can record consent obtained."
              : "✨ Client created. No email on file — share the consent link from the Consent tab, or record consent obtained to begin."}
          </span>
          <button
            onClick={dismissNewClientReminder}
            style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", color: "#55698F", flexShrink: 0 }}
            className="hover:bg-[#DCE6F3] transition-colors"
            aria-label="Dismiss reminder"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Back link */}
      <button
        onClick={() => router.push("/clients")}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#55698F", background: "none", border: "none", cursor: "pointer", marginBottom: 14, padding: 0 }}
        className="hover:text-primary transition-colors"
      >
        ‹ All clients
      </button>

      {/* Header card */}
      <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, padding: "20px 24px", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          {/* Left: avatar + info */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minWidth: 0 }}>
            {(() => {
              const [bg, color] = avatarColors(client.name);
              return (
                <span style={{ display: "grid", placeItems: "center", width: 62, height: 62, borderRadius: "50%", background: bg, color, fontWeight: 700, fontSize: 20, flexShrink: 0 }}>
                  {initials(client.name)}
                </span>
              );
            })()}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.025em", color: "#0B2B6B", margin: 0 }}>
                  {client.name}
                </h1>
                {(() => {
                  const s = { active: { bg: "#E7F6EC", c: "#3B9E57" }, inactive: { bg: "#EEF1F5", c: "#6E7E97" }, completed: { bg: "#E4F1FF", c: "#2F80FF" }, transferred: { bg: "#FBF2DA", c: "#A9821F" } }[client.status] ?? { bg: "#EEF1F5", c: "#6E7E97" };
                  return <span style={{ background: s.bg, color: s.c, fontWeight: 600, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}>{client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span>;
                })()}
                {consentStatus && (() => {
                  const p = consentStatus.signed
                    ? { bg: "#E7F6EC", c: "#3B9E57", label: "Consent: signed" }
                    : consentStatus.overridden
                      ? { bg: "#EEF1F5", c: "#6E7E97", label: "Consent: recorded in person" }
                      : { bg: "#FBF2DA", c: "#A9821F", label: "Consent: pending" };
                  return <span style={{ background: p.bg, color: p.c, fontWeight: 600, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}>{p.label}</span>;
                })()}
              </div>
              <p style={{ fontSize: 13.5, color: "#55698F", margin: "6px 0 0" }}>
                {counselor?.name && (<>Assigned to <strong style={{ color: "#0B2B6B" }}>{counselor.name}</strong> · </>)}
                {ageFromDob(client.dateOfBirth) ?? "—"} / {genderLabel(client.gender)}
              </p>
              {attendance && (attendance.noShows90 > 0 || attendance.cancellations90 > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {attendance.noShows90 > 0 && (
                    <span style={{ background: "#FDECEC", color: "#C0392B", fontWeight: 600, fontSize: 11.5, padding: "2px 9px", borderRadius: 999 }} title="No-shows in the last 90 days">
                      {attendance.noShows90} no-show{attendance.noShows90 === 1 ? "" : "s"} (90d)
                    </span>
                  )}
                  {attendance.cancellations90 > 0 && (
                    <span style={{ background: "#FBF2DA", color: "#A9821F", fontWeight: 600, fontSize: 11.5, padding: "2px 9px", borderRadius: 999 }} title="Cancellations in the last 90 days">
                      {attendance.cancellations90} cancel{attendance.cancellations90 === 1 ? "" : "s"} (90d)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Right: action row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <ReassignControl
              client={client}
              onReassigned={({ counselorId, counselorName }) => {
                setClient((c) => (c ? { ...c, counselorId } : c));
                setCounselor((cur) => ({ ...(cur ?? {}), _id: counselorId, name: counselorName }));
              }}
            />
            <button
              onClick={() => setIsEditing(true)}
              style={{ borderRadius: 10, border: "1px solid #E3ECF7", background: "#fff", padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#0B2B6B", cursor: "pointer" }}
              className="hover:bg-[#F2F7FD] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteClient}
              style={{ borderRadius: 10, border: "1px solid #FECACA", background: "#fff", padding: "7px 14px", fontSize: 13, fontWeight: 600, color: "#C0392B", cursor: "pointer" }}
              className="hover:bg-[#FEF2F2] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid #E3ECF7", marginBottom: 24 }}>
        <nav style={{ display: "flex" }}>
          {[
            { key: "overview", label: "Overview" },
            { key: "sessions", label: "Sessions" },
            { key: "progress", label: "Assessments" },
            { key: "reports", label: "Reports" },
            { key: "consent-billing", label: "Billing & Consent" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "10px 18px",
                fontSize: 13.5,
                fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? "#0B2B6B" : "#55698F",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.key ? "2.5px solid #2F80FF" : "2.5px solid transparent",
                cursor: "pointer",
                transition: "all 150ms",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* IntakeAssessment + ReassessmentBanner shown on all tabs */}
      <div className="mb-4">
        <IntakeAssessment
          clientId={clientId}
          consentStatus={consentStatus}
          assessmentExists={assessmentExists}
          latestAssessmentAt={latestAssessmentAt}
          notesUpdatedAt={client?.initialAssessmentUpdatedAt}
          latestBaselineAt={latestBaselineAt}
          onDone={() => { setAiRefreshKey((k) => k + 1); refreshAssessment(); }}
          onConsentOverridden={() => setConsentStatus((prev) => ({ ...prev, overridden: true }))}
        />
      </div>
      <ReassessmentBanner clientId={clientId} />

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* Baseline measures card — visible during intake phase */}
            {assessmentExists === false && (
              <div style={{ background: "#EEF4FB", border: "1px solid #CBE0F8", borderRadius: 16, padding: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0B2B6B", margin: 0 }}>Baseline measures</h3>
                  <p style={{ fontSize: 13.5, color: "#2F80FF", marginTop: 4 }}>
                    Administer baseline measures to establish a starting point. These inform the
                    assessment and anchor progress tracking.
                  </p>
                  {administeredInstruments.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {listInstruments()
                        .filter((i) => administeredInstruments.includes(i.id))
                        .map((i) => (
                          <span
                            key={i.id}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#E7F6EC", color: "#3B9E57", fontWeight: 600, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}
                          >
                            {i.shortName ?? i.id.toUpperCase()} ✓
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <MeasuresPanel
                  clientId={clientId}
                  compact
                  onSaved={(instrumentId) => {
                    if (instrumentId) setAdministeredInstruments((prev) => prev.includes(instrumentId) ? prev : [...prev, instrumentId]);
                  }}
                />
              </div>
            )}

            {/* Score chips — post-intake glanceable summary */}
            {assessmentExists === true && (
              <MeasureGlance
                clientId={clientId}
                onViewAssessments={() => setActiveTab("progress")}
              />
            )}

            {/* AI clinical picture */}
            <ClientInsights clientId={client._id} refreshKey={aiRefreshKey} />

            {/* Basic + Contact info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: "20px 22px", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
                <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: "0 0 12px" }}>Basic Information</h2>
                <dl>
                  {[
                    { label: "Name", value: client.name },
                    { label: "Age", value: (<>{ageFromDob(client.dateOfBirth) ?? "—"}{client.dateOfBirth && <span style={{ fontSize: 12.5, color: "#8298BC", marginLeft: 8 }}>DOB {formatDob(client.dateOfBirth)}</span>}</>) },
                    { label: "Gender", value: (<>{genderLabel(client.gender)}{client.pronouns && <span style={{ fontSize: 12.5, color: "#8298BC", marginLeft: 8 }}>({client.pronouns})</span>}</>) },
                    { label: "Status", value: client.status.charAt(0).toUpperCase() + client.status.slice(1) },
                    { label: "Created", value: formatDate(client.createdAt) },
                    { label: "Last Updated", value: formatDate(client.updatedAt) },
                  ].map(({ label, value }, i) => (
                    <div key={label} style={{ display: "grid", gridTemplateColumns: "108px 1fr", padding: "9px 0", borderTop: i > 0 ? "1px solid #E3ECF7" : "none" }}>
                      <dt style={{ fontSize: 13, fontWeight: 500, color: "#8298BC" }}>{label}</dt>
                      <dd style={{ fontSize: 13.5, color: "#0B2B6B" }}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: "20px 22px", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
                <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: "0 0 12px" }}>Contact Information</h2>
                <dl>
                  <div style={{ display: "grid", gridTemplateColumns: "108px 1fr", padding: "9px 0" }}>
                    <dt style={{ fontSize: 13, fontWeight: 500, color: "#8298BC" }}>Email</dt>
                    <dd style={{ fontSize: 13.5, color: "#0B2B6B" }}>{client.contactInfo?.email || "—"}</dd>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "108px 1fr", padding: "9px 0", borderTop: "1px solid #E3ECF7" }}>
                    <dt style={{ fontSize: 13, fontWeight: 500, color: "#8298BC" }}>Phone</dt>
                    <dd style={{ fontSize: 13.5, color: "#0B2B6B" }}>{client.contactInfo?.phone || "—"}</dd>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "108px 1fr", padding: "9px 0", borderTop: "1px solid #E3ECF7" }}>
                    <dt style={{ fontSize: 13, fontWeight: 500, color: "#8298BC" }}>Emergency</dt>
                    <dd style={{ fontSize: 13.5, color: "#0B2B6B" }}>
                      {client.contactInfo?.emergencyContact ? (
                        <div>
                          {client.contactInfo.emergencyContact.name && `${client.contactInfo.emergencyContact.name}`}
                          {client.contactInfo.emergencyContact.relationship && (
                            <span>
                              {client.contactInfo.emergencyContact.name ? ", " : ""}
                              {client.contactInfo.emergencyContact.relationship}
                            </span>
                          )}
                          {client.contactInfo.emergencyContact.phone && (
                            <span>
                              {client.contactInfo.emergencyContact.name || client.contactInfo.emergencyContact.relationship ? ", " : ""}
                              {client.contactInfo.emergencyContact.phone}
                            </span>
                          )}
                          {!client.contactInfo.emergencyContact.name && !client.contactInfo.emergencyContact.relationship && !client.contactInfo.emergencyContact.phone && "—"}
                        </div>
                      ) : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Initial Assessment */}
            <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: "20px 22px", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, color: "#0B2B6B", margin: 0 }}>Initial Assessment</h2>
                <button
                  onClick={() => router.push(`/sessions/new?clientId=${clientId}`)}
                  style={{ fontSize: 13.5, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer" }}
                  className="hover:text-primary/70 transition-colors"
                >
                  + Add New Session
                </button>
              </div>
              <div style={{ background: "#F2F7FD", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 14, color: "#0B2B6B", whiteSpace: "pre-line", lineHeight: 1.65, margin: 0 }}>
                  {client.initialAssessment}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, color: "#0B2B6B", margin: 0 }}>Therapy sessions</h2>
              <button
                onClick={() => router.push(`/sessions/new?clientId=${clientId}`)}
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "8px 16px", borderRadius: 10, boxShadow: "0 10px 28px -10px rgba(47,128,255,.8)", transition: "transform .16s, box-shadow .16s" }}
              >
                New session
              </button>
            </div>
            <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 18, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", overflow: "hidden" }}>
              {sessions.length > 0 ? (
                <>
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 0.7fr", gap: 0, background: "#F6FAFE", padding: "10px 20px", borderBottom: "1px solid #E9F0F9" }}>
                    {["Date", "Duration", "Type", "Status", "Actions"].map((h) => (
                      <span key={h} style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8298BC" }}>{h}</span>
                    ))}
                  </div>
                  {sessions.map((session, i) => {
                    const statusPill = {
                      completed: { bg: "#E7F6EC", color: "#3B9E57", label: "Completed" },
                      scheduled: { bg: "#E2F4F2", color: "#158A98", label: "Scheduled" },
                      cancelled: { bg: "#EEF1F5", color: "#6E7E97", label: "Cancelled" },
                    }[session.status];
                    return (
                      <div
                        key={session._id}
                        style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 0.7fr", gap: 0, padding: "13px 20px", borderBottom: i < sessions.length - 1 ? "1px solid #F2F6FB" : "none", fontSize: 14, color: "#24344F", alignItems: "center", transition: "background .13s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F9FE"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontWeight: 500 }}>{formatDate(session.date)}</span>
                        <span style={{ color: "#55698F" }}>{session.duration} min</span>
                        <span style={{ color: "#55698F", textTransform: "capitalize" }}>{session.type}</span>
                        <span>
                          {statusPill ? (
                            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: statusPill.bg, color: statusPill.color }}>{statusPill.label}</span>
                          ) : (
                            <span style={{ color: "#8298BC" }}>{session.status}</span>
                          )}
                        </span>
                        <span>
                          <a href={`/sessions/${session._id}`} style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", textDecoration: "none" }}>View</a>
                        </span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <p style={{ fontSize: 14, color: "#55698F", margin: 0 }}>No therapy sessions recorded yet.</p>
                  <p style={{ fontSize: 13, color: "#8298BC", marginTop: 6 }}>Add a new session to track your client&apos;s progress.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, color: "#0B2B6B", margin: 0 }}>Reports</h2>
              <Link
                href={`/clients/${clientId}/reports/new`}
                style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "8px 16px", borderRadius: 10, boxShadow: "0 10px 28px -10px rgba(47,128,255,.8)", textDecoration: "none", display: "inline-block" }}
              >
                New report
              </Link>
            </div>
            <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 18, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", overflow: "hidden" }}>
              {recentReports.length > 0 ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.9fr", gap: 0, background: "#F6FAFE", padding: "10px 20px", borderBottom: "1px solid #E9F0F9" }}>
                    {["Title", "Date", "Type", "Actions"].map((h) => (
                      <span key={h} style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#8298BC" }}>{h}</span>
                    ))}
                  </div>
                  {recentReports.map((report, i) => (
                    <div
                      key={report._id}
                      style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.9fr", gap: 0, padding: "13px 20px", borderBottom: i < recentReports.length - 1 ? "1px solid #F2F6FB" : "none", fontSize: 14, color: "#24344F", alignItems: "center", transition: "background .13s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F9FE"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontWeight: 500 }}>{getReportTitle(report)}</span>
                      <span style={{ color: "#55698F" }}>{formatDate(report.createdAt)}</span>
                      <span>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: "#EEF1F5", color: "#6E7E97" }}>
                          {(report.agentType ?? "report").charAt(0).toUpperCase() + (report.agentType ?? "report").slice(1)}
                        </span>
                      </span>
                      <span style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => handleViewReport(report)} style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}>View</button>
                        <button onClick={() => handleDeleteReport(report._id)} style={{ fontSize: 13, fontWeight: 600, color: "#C0392B", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Delete</button>
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <p style={{ fontSize: 14, color: "#55698F", margin: 0 }}>No reports generated yet.</p>
                  <p style={{ fontSize: 13, color: "#8298BC", marginTop: 6 }}>Generate a new report to document assessment findings or treatment progress.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <MeasuresPanel clientId={client._id} sections hideHistory />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", marginBottom: 12, paddingLeft: 2 }}>
                Risk level over time
              </div>
              <ClientAnalytics clientId={client._id} />
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", marginBottom: 12, paddingLeft: 2 }}>
                History
              </div>
              <AdministrationHistory clientId={client._id} onDeleted={refreshAdministeredInstruments} />
            </div>
          </div>
        )}

        {activeTab === "consent-billing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Consent Forms Card */}
            <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 17, letterSpacing: "-.01em", margin: 0, color: "#0B2B6B" }}>Consent forms</h2>
                  <p style={{ fontSize: 12.5, color: "#8298BC", margin: "3px 0 0" }}>Request, track and review the client&apos;s signed agreements.</p>
                </div>
                <button
                  onClick={() => setShowConsentModal(true)}
                  style={{ border: "none", cursor: "pointer", fontFamily: "inherit", background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 13.5, padding: "10px 16px", borderRadius: 10, boxShadow: "0 16px 40px -18px rgba(47,128,255,.8)", transition: "transform .16s, box-shadow .16s", flexShrink: 0 }}
                >
                  Request new consent
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {consentForms.map((form) => {
                  const statusStyle = ({ signed: { bg: "#E7F6EC", color: "#3B9E57" }, pending: { bg: "#FBF2DA", color: "#A9821F" }, expired: { bg: "#FDECEC", color: "#C0392B" } }[form.status]) ?? { bg: "#EEF1F5", color: "#6E7E97" };
                  const metaLine = form.dateSigned
                    ? `Signed ${new Date(form.dateSigned).toLocaleDateString()}`
                    : form.requestedAt
                      ? `Sent ${new Date(form.requestedAt).toLocaleDateString()} · awaiting signature`
                      : "";
                  return (
                    <div
                      key={form._id}
                      onClick={() => handleViewConsent(form)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, border: "1px solid #E7EEF7", borderRadius: 13, padding: "14px 16px", cursor: "pointer", transition: "background .13s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#F5F9FE"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0B2B6B" }}>{form.type}</div>
                        <div style={{ fontSize: 12.5, color: "#8298BC", marginTop: 2 }}>
                          Version {form.version}{metaLine ? ` · ${metaLine}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, background: statusStyle.bg, color: statusStyle.color }}>
                          {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                        </span>
                        {form.status !== "signed" && (
                          client?.contactInfo?.email ? (
                            <button
                              onClick={(e) => handleResendConsent(form._id, e)}
                              style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              title="Email the client a fresh signing link"
                            >
                              Resend
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = `${window.location.origin}/client-portal/consent/${form.token}`;
                                navigator.clipboard.writeText(link);
                                toast.success("Signing link copied — share it with the client.");
                              }}
                              style={{ fontSize: 13, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                              title="No email on file — copy the signing link to share manually"
                            >
                              Copy link
                            </button>
                          )
                        )}
                        <button
                          onClick={(e) => handleDeleteConsent(form._id, e)}
                          style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, color: "#A6B8D4", background: "none", border: "none", cursor: "pointer", transition: "all .13s" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#EAF3FF"; e.currentTarget.style.color = "#2F80FF"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#A6B8D4"; }}
                          title="Delete consent form"
                        >
                          <TrashIcon style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {consentForms.length === 0 && (
                  <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>No consent forms yet.</p>
                )}
              </div>
            </div>

            {/* Billing Information */}
            <BillingInfo client={client} onUpdate={handleClientUpdate} onDelete={handleDeleteBilling} />

            {/* Insurance Information */}
            <InsuranceInfo client={client} onUpdate={handleClientUpdate} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 28px 24px", maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, color: "#0B2B6B", margin: "0 0 20px" }}>
              {selectedConsent ? "View consent form" : "Request new consent"}
            </h2>

            {selectedConsent ? (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0B2B6B" }}>{selectedConsent.type}</div>
                  <div style={{ fontSize: 13, color: "#8298BC", marginTop: 4 }}>
                    Version {selectedConsent.version} · Status: {selectedConsent.status}
                  </div>
                  {selectedConsent.dateSigned && (
                    <div style={{ fontSize: 13, color: "#8298BC", marginTop: 2 }}>
                      Signed {new Date(selectedConsent.dateSigned).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {(selectedConsent.signedDocument || selectedConsent.document) && (
                  <div style={{ marginBottom: 16 }}>
                    <a
                      href={selectedConsent.signedDocument || selectedConsent.document}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13.5, fontWeight: 600, color: "#2F80FF" }}
                    >
                      {selectedConsent.signedDocument ? "View signed document" : "View original document"}
                    </a>
                  </div>
                )}

                {selectedConsent.status === "pending" && !selectedConsent.signedDocument && (
                  <p style={{ fontSize: 13, color: "#A9821F", background: "#FBF2DA", borderRadius: 10, padding: "10px 14px", margin: "0 0 16px" }}>
                    Waiting for client to upload signed document.
                  </p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setSelectedConsent(null); setShowConsentModal(false); }}
                    style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#55698F", background: "#F2F6FB", border: "none", borderRadius: 10, cursor: "pointer" }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestConsent}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#55698F", marginBottom: 4 }}>Consent type</label>
                    <select
                      value={selectedConsentType}
                      onChange={handleConsentTypeChange}
                      className="focus:ring-2 focus:ring-ring"
                      style={{ display: "block", width: "100%", borderRadius: 10, border: "1px solid var(--input, #E3ECF7)", padding: "9px 12px", fontSize: 14, color: "#24344F", outline: "none", fontFamily: "inherit" }}
                      required
                    >
                      <option value="">Select a consent type</option>
                      {availableTemplates.map((template) => (
                        <option key={template.type} value={template.type}>
                          {template.title} (v{template.version})
                        </option>
                      ))}
                    </select>
                  </div>

                  {consentFormContent && (
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#55698F", marginBottom: 4 }}>Form preview</label>
                      <div style={{ border: "1px solid #E7EEF7", borderRadius: 10, padding: "12px 14px", background: "#F7FAFE", maxHeight: 220, overflowY: "auto" }}>
                        <ConsentMarkdown content={consentFormContent} />
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#55698F", marginBottom: 4 }}>Notes</label>
                    <textarea
                      value={consentFormNotes}
                      onChange={(e) => setConsentFormNotes(e.target.value)}
                      rows={3}
                      className="focus:ring-2 focus:ring-ring"
                      style={{ display: "block", width: "100%", borderRadius: 10, border: "1px solid var(--input, #E3ECF7)", padding: "9px 12px", fontSize: 14, color: "#24344F", outline: "none", fontFamily: "inherit", resize: "vertical" }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setShowConsentModal(false)}
                      style={{ padding: "9px 18px", fontSize: 14, fontWeight: 600, color: "#55698F", background: "#F2F6FB", border: "none", borderRadius: 10, cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: "9px 18px", fontSize: 14, fontWeight: 700, color: "#fff", background: "#2F80FF", border: "none", borderRadius: 10, cursor: "pointer", boxShadow: "0 8px 20px -8px rgba(47,128,255,.7)" }}
                    >
                      Request consent
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
