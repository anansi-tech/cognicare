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
          )
        )
      )
      .then((trends) => setScores(trends.filter((t) => t.points?.length > 0)));
  }, [clientId]);

  if (scores.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {scores.map((t) => {
        const arrow = t.delta == null ? null : t.delta > 0 ? "↑" : t.delta < 0 ? "↓" : "→";
        const arrowColor =
          t.direction === "improved" ? "text-green-600"
          : t.direction === "worsened" ? "text-red-600"
          : "text-gray-400";
        const pct = t.percentageFactor ? `/${t.scoringMax} (${t.latest * t.percentageFactor}%)` : "";
        return (
          <span key={t.instrumentId} className="text-sm text-gray-700">
            <span className="font-medium">{t.name}</span>:{" "}
            {t.latest}{pct} · {t.points.at(-1)?.band}
            {arrow && <span className={`ml-1 font-medium ${arrowColor}`}>{arrow}</span>}
          </span>
        );
      })}
      <button
        onClick={onViewAssessments}
        className="text-xs text-primary hover:text-primary/80"
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
  const [counselor, setCounselor] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bindClient } = useLiam();

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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && error !== "no_reports") {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Warning: </strong>
        <span className="block sm:inline">Client not found</span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit Client</h1>
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
    <div className="container mx-auto px-4 py-8">
      {/* New Client Reminder Banner (logic remains the same) */}
      {showNewClientReminder && (
        <div className="mb-4 p-3 bg-accent text-accent-foreground rounded-lg flex justify-between items-center">
          <span>
            {client?.contactInfo?.email
              ? "✨ Client created. A consent form has been emailed to the client — the AI pipeline will begin once it’s signed, or you can record consent obtained."
              : "✨ Client created. No email on file — share the consent link from the Consent tab, or record consent obtained to begin."}
          </span>
          <button
            onClick={dismissNewClientReminder}
            className="text-accent-foreground hover:opacity-80 ml-4"
            aria-label="Dismiss reminder"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {client.name}{" "}
            <span
              className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                client.status === "active"
                  ? "bg-green-100 text-green-800"
                  : client.status === "inactive"
                    ? "bg-gray-100 text-gray-800"
                    : client.status === "completed"
                      ? "bg-accent text-accent-foreground"
                      : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
            </span>
            {consentStatus && (
              <span
                className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                  consentStatus.signed
                    ? "bg-emerald-100 text-emerald-800"
                    : consentStatus.overridden
                      ? "bg-slate-100 text-slate-700"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {consentStatus.signed
                  ? "Consent: signed"
                  : consentStatus.overridden
                    ? "Consent: recorded in person"
                    : "Consent: pending"}
              </span>
            )}
          </h1>
          {counselor?.name && (
            <p className="mt-1 text-sm text-gray-600">
              Assigned to <span className="font-medium text-gray-800">{counselor.name}</span>
            </p>
          )}
          {attendance &&
            (attendance.noShows90 > 0 || attendance.cancellations90 > 0) && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {attendance.noShows90 > 0 && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800"
                    title="No-shows in the last 90 days"
                  >
                    {attendance.noShows90} no-show
                    {attendance.noShows90 === 1 ? "" : "s"} (90d)
                  </span>
                )}
                {attendance.cancellations90 > 0 && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                    title="Cancellations in the last 90 days"
                  >
                    {attendance.cancellations90} cancel
                    {attendance.cancellations90 === 1 ? "" : "s"} (90d)
                  </span>
                )}
              </div>
            )}
        </div>
        <div className="space-x-2">
          <button
            onClick={() => router.push("/clients")}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Back
          </button>
          <ReassignControl
            client={client}
            onReassigned={({ counselorId, counselorName }) => {
              setClient((c) => (c ? { ...c, counselorId } : c));
              setCounselor((cur) => ({ ...(cur ?? {}), _id: counselorId, name: counselorName }));
            }}
          />
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClient}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sessions"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "progress"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Assessments
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab("consent-billing")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "consent-billing"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Billing &amp; Consent
          </button>
        </nav>
      </div>

      {/* Auto-run intake on first view of a client without an assessment. */}
      <div className="mb-4">
        <IntakeAssessment
          clientId={clientId}
          consentStatus={consentStatus}
          assessmentExists={assessmentExists}
          latestAssessmentAt={latestAssessmentAt}
          notesUpdatedAt={client?.initialAssessmentUpdatedAt}
          onDone={() => { setAiRefreshKey((k) => k + 1); refreshAssessment(); }}
          onConsentOverridden={() => setConsentStatus((prev) => ({ ...prev, overridden: true }))}
        />
      </div>
      <ReassessmentBanner clientId={clientId} />

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Baseline measures card — visible during intake phase (before assessment runs).
                Collapses once the assessment has been generated. */}
            {assessmentExists === false && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">Baseline measures</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Administer baseline measures to establish a starting point. These inform the
                    assessment and anchor progress tracking.
                  </p>
                  {administeredInstruments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {listInstruments()
                        .filter((i) => administeredInstruments.includes(i.id))
                        .map((i) => (
                          <span
                            key={i.id}
                            className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5"
                          >
                            {i.shortName ?? i.id.toUpperCase()} <span aria-hidden>✓</span>
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

            {/* The AI clinical picture leads the overview — risk, assessment, diagnosis, treatment. */}
            <ClientInsights clientId={client._id} refreshKey={aiRefreshKey} />

            {/* Compact score glance — only once the assessment has been run (post-intake). */}
            {assessmentExists === true && (
              <MeasureGlance
                clientId={clientId}
                onViewAssessments={() => setActiveTab("progress")}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Basic Information</h2>
                <dl className="divide-y divide-gray-200">
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{client.name}</dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Age</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {ageFromDob(client.dateOfBirth) ?? "—"}
                      {client.dateOfBirth && (
                        <span className="ml-2 text-xs text-gray-500">
                          (DOB {formatDob(client.dateOfBirth)})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Gender</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {genderLabel(client.gender)}
                      {client.pronouns && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({client.pronouns})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {formatDate(client.createdAt)}
                    </dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {formatDate(client.updatedAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Contact Info */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Contact Information</h2>
                <dl className="divide-y divide-gray-200">
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {client.contactInfo?.email || "-"}
                    </dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {client.contactInfo?.phone || "-"}
                    </dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {client.contactInfo?.emergencyContact ? (
                        <div>
                          {client.contactInfo.emergencyContact.name &&
                            `${client.contactInfo.emergencyContact.name}`}

                          {client.contactInfo.emergencyContact.relationship && (
                            <span>
                              {client.contactInfo.emergencyContact.name ? ", " : ""}
                              {client.contactInfo.emergencyContact.relationship}
                            </span>
                          )}

                          {client.contactInfo.emergencyContact.phone && (
                            <span>
                              {client.contactInfo.emergencyContact.name ||
                              client.contactInfo.emergencyContact.relationship
                                ? ", "
                                : ""}
                              {client.contactInfo.emergencyContact.phone}
                            </span>
                          )}

                          {!client.contactInfo.emergencyContact.name &&
                            !client.contactInfo.emergencyContact.relationship &&
                            !client.contactInfo.emergencyContact.phone &&
                            "-"}
                        </div>
                      ) : (
                        "-"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Initial Assessment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-medium text-gray-900">Initial Assessment</h2>
                <button
                  onClick={() => router.push(`/sessions/new?clientId=${clientId}`)}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  + Add New Session
                </button>
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-line">
                  {client.initialAssessment}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "sessions" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Therapy Sessions</h2>
              <button
                onClick={() => router.push(`/sessions/new?clientId=${clientId}`)}
                className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
              >
                New Session
              </button>
            </div>
            {sessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(session.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.duration} minutes
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <a
                            href={`/sessions/${session._id}`}
                            className="text-primary hover:text-primary/80 mr-4"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No therapy sessions recorded yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Add a new session to track your client&apos;s progress.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Reports</h2>
              <Link
                href={`/clients/${clientId}/reports/new`}
                className="px-3 py-1 bg-primary text-white rounded hover:bg-primary/90"
              >
                New report
              </Link>
            </div>
            {recentReports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentReports.map((report) => (
                      <tr key={report._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {getReportTitle(report)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(report.agentType ?? "report").charAt(0).toUpperCase() +
                            (report.agentType ?? "report").slice(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="text-primary hover:text-primary/80 mr-4"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No reports generated yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Generate a new report to document assessment findings or treatment progress.
                </p>
              </div>
            )}

          </div>
        )}

        {activeTab === "progress" && (
          <div className="space-y-8">
            <MeasuresPanel clientId={client._id} sections />
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Risk Over Time</h2>
              <ClientAnalytics clientId={client._id} />
            </div>
          </div>
        )}

        {activeTab === "consent-billing" && (
          <div className="space-y-8">
            {/* Consent Forms Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Consent Forms</h3>
                <button
                  onClick={() => setShowConsentModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                >
                  Request New Consent
                </button>
              </div>

              <div className="space-y-4">
                {consentForms.map((form) => (
                  <div
                    key={form._id}
                    onClick={() => handleViewConsent(form)}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{form.type}</h4>
                        <p className="text-sm text-gray-500">Version {form.version}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            form.status === "signed"
                              ? "bg-green-100 text-green-800"
                              : form.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : form.status === "expired"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {form.status}
                        </span>
                        {form.status !== "signed" && (
                          client?.contactInfo?.email ? (
                            <button
                              onClick={(e) => handleResendConsent(form._id, e)}
                              className="text-xs text-primary hover:text-primary/80"
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
                              className="text-xs text-primary hover:text-primary/80"
                              title="No email on file — copy the signing link to share manually"
                            >
                              Copy link
                            </button>
                          )
                        )}
                        <button
                          onClick={(e) => handleDeleteConsent(form._id, e)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete consent form"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>
                        Requested on{" "}
                        {form.requestedAt ? new Date(form.requestedAt).toLocaleDateString() : "N/A"}
                      </p>
                      {form.dateSigned && (
                        <p>Signed on {new Date(form.dateSigned).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
                {consentForms.length === 0 && (
                  <p className="text-sm text-gray-500">No consent forms yet</p>
                )}
              </div>
            </div>

            {/* Billing Information Section */}
            <BillingInfo
              client={client}
              onUpdate={handleClientUpdate}
              onDelete={handleDeleteBilling}
            />

            {/* Insurance Information Section */}
            <InsuranceInfo client={client} onUpdate={handleClientUpdate} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {selectedConsent ? "View Consent Form" : "Request New Consent"}
            </h2>

            {selectedConsent ? (
              <div>
                <div className="mb-4">
                  <h3 className="font-semibold">{selectedConsent.type}</h3>
                  <p className="text-sm text-gray-600">Version: {selectedConsent.version}</p>
                  <p className="text-sm text-gray-600">Status: {selectedConsent.status}</p>
                  {selectedConsent.dateSigned && (
                    <p className="text-sm text-gray-600">
                      Date Signed: {new Date(selectedConsent.dateSigned).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Determine which document URL to show */}
                {(selectedConsent.signedDocument || selectedConsent.document) && (
                  <div className="mb-4">
                    <a
                      href={selectedConsent.signedDocument || selectedConsent.document}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedConsent.signedDocument
                        ? "View Signed Document"
                        : "View Original Document"}
                    </a>
                  </div>
                )}

                {/* Conditionally show upload if pending? (Optional enhancement) */}
                {selectedConsent.status === "pending" && !selectedConsent.signedDocument && (
                  <p className="text-sm text-yellow-700">
                    Waiting for client to upload signed document.
                  </p>
                )}

                {/* Add other actions like Revoke/Resend if needed */}

                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSelectedConsent(null);
                      setShowConsentModal(false);
                    }}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestConsent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Consent Type</label>
                  <select
                    value={selectedConsentType}
                    onChange={handleConsentTypeChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-ring px-3 py-2"
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
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Form Preview</label>
                    <div className="mt-1 p-4 bg-gray-50 rounded-md max-h-60 overflow-y-auto">
                      <ConsentMarkdown content={consentFormContent} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={consentFormNotes}
                    onChange={(e) => setConsentFormNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-ring px-3 py-2"
                    rows="3"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowConsentModal(false)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
                  >
                    Request Consent
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
