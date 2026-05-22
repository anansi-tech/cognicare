"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ClientForm from "./ClientForm";
import ClientInsights from "./ClientInsights";
import ClientAnalytics from "./ClientAnalytics";
import AIWorkflow from "./AIWorkflow";
import SessionPrepView from "./SessionPrepView";
import { useAIWorkflow } from "@/app/context/AIWorkflowContext";
import {
  getConsentFormTemplate,
  getAvailableTemplates,
  generateConsentFormPDF,
} from "@/lib/templates/consentFormTemplate";
import BillingInfo from "./BillingInfo";
import InsuranceInfo from "./InsuranceInfo";
import {
  ClipboardDocumentIcon,
  XMarkIcon,
  PrinterIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export default function ClientDetail({ clientId }) {
  const [client, setClient] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportType, setReportType] = useState("progress");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [selectedConsent, setSelectedConsent] = useState(null);
  const [selectedConsentType, setSelectedConsentType] = useState("");
  const [consentFormContent, setConsentFormContent] = useState("");
  const [consentFormNotes, setConsentFormNotes] = useState("");
  const [consentFormFile, setConsentFormFile] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showNewClientReminder, setShowNewClientReminder] = useState(false);
  const router = useRouter();

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

  // Set default dates to last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
  }, []);

  console.log(selectedReport);

  // Check for tab parameter in URL on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (
        tabParam &&
        [
          "overview",
          "sessions",
          "reports",
          "treatment",
          "insights",
          "analytics",
          "ai-assistant",
        ].includes(tabParam)
      ) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  useEffect(() => {
    setAvailableTemplates(getAvailableTemplates());
  }, []);

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
    const type = report.type.charAt(0).toUpperCase() + report.type.slice(1);
    const date = formatDate(report.createdAt);
    return `${type} Report - ${date}`;
  };

  const handleViewReport = (report) => {
    window.open(`/clients/${clientId}/reports/${report._id}/view`, "_blank");
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: reportType,
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      // Close the generate modal and refresh only the reports list
      setShowGenerateModal(false);
      fetchReports();
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
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

    if (!consentFormFile) {
      toast.error("Please upload a PDF file");
      return;
    }
    if (!selectedConsentType) {
      toast.error("Please select a consent type");
      return;
    }

    const formData = new FormData();
    formData.append("clientId", client._id);
    formData.append("type", selectedConsentType);
    formData.append("file", consentFormFile);
    formData.append("notes", consentFormNotes);

    const toastId = toast.loading("Requesting consent...");

    try {
      const response = await fetch("/api/consent-forms", {
        method: "POST",
        body: formData,
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

      // Update client state with the updated client data containing the new form
      setClient(newConsentData.client);

      // Construct the shareable link
      const shareableLink = `${window.location.origin}/client-portal/consent/${newConsentData.newConsentForm.token}`;

      // Reset form state
      setSelectedConsentType("");
      setConsentFormContent("");
      setConsentFormNotes("");
      setConsentFormFile(null);
      setShowConsentModal(false);

      // Show success toast with the link and copy button
      toast.success(
        (t) => (
          <span className="flex flex-col items-start">
            <span>Consent requested successfully! Email sent to client.</span>
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
                className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
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
      const response = await fetch(`/api/clients/${client._id}/consent-forms/${formId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete consent form");
      }

      // Update client state
      setClient((prev) => ({
        ...prev,
        consentForms: prev.consentForms.filter((form) => form._id.toString() !== formId.toString()),
      }));
    } catch (error) {
      console.error("Error deleting consent form:", error);
      alert(error.message || "Failed to delete consent form");
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
        <div className="mb-4 p-3 bg-blue-50 border border-blue-300 text-blue-800 rounded-lg flex justify-between items-center">
          <span>
            ✨ New client created successfully! Run the AI Initial Assessment from the AI Assistant
            tab when ready.
          </span>
          <button
            onClick={dismissNewClientReminder}
            className="text-blue-600 hover:text-blue-800 ml-4"
            aria-label="Dismiss reminder"
          >
            {/* TODO: add a close icon from heroicons */}
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {client.name}{" "}
          <span
            className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
              client.status === "active"
                ? "bg-green-100 text-green-800"
                : client.status === "inactive"
                  ? "bg-gray-100 text-gray-800"
                  : client.status === "completed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
          </span>
        </h1>
        <div className="space-x-2">
          <button
            onClick={() => router.push("/clients")}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Back
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
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
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sessions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "insights"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Insights
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "analytics"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("ai-assistant")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "ai-assistant"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab("consent-billing")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "consent-billing"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Consent & Billing
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
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
                    <dd className="text-sm text-gray-900 col-span-2">{client.age}</dd>
                  </div>
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Gender</dt>
                    <dd className="text-sm text-gray-900 col-span-2">
                      {client.gender.charAt(0).toUpperCase() + client.gender.slice(1)}
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
              <h2 className="text-lg font-medium text-gray-900 mb-2">Initial Assessment</h2>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-900 whitespace-pre-line">
                  {client.initialAssessment}
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Recent Sessions</h2>
                {recentSessions.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {recentSessions.map((session) => (
                      <li key={session._id} className="py-2">
                        <a
                          href={`/sessions/${session._id}`}
                          className="block hover:bg-gray-50 transition duration-150 ease-in-out"
                        >
                          <p className="text-sm font-medium text-blue-600">
                            {formatDate(session.date)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.notes?.substring(0, 100)}...
                          </p>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No recent sessions found.</p>
                )}
                <button
                  onClick={() => router.push(`/sessions/new?clientId=${clientId}`)}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add New Session
                </button>
              </div>

              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Recent Reports</h2>
                {recentReports.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {recentReports.map((report) => (
                      <li key={report._id} className="py-2">
                        <a
                          href={`/clients/${clientId}/reports/${report._id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:bg-gray-50 transition duration-150 ease-in-out"
                        >
                          <p className="text-sm font-medium text-blue-600">{report.title}</p>
                          <p className="text-xs text-gray-500">{formatDate(report.createdAt)}</p>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No recent reports found.</p>
                )}
                <button
                  onClick={() => setShowGenerateModal(true)} //TODO: fix or remove
                  className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                >
                  Generate Report
                </button>
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
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                New Session
              </button>
            </div>
            {recentSessions.length > 0 ? (
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
                    {recentSessions.map((session) => (
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
                            className="text-blue-600 hover:text-blue-900 mr-4"
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
              <button
                onClick={() => setShowGenerateModal(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Generate Report
              </button>
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
                          {report.type.charAt(0).toUpperCase() + report.type.slice(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
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

            {/* Generate Report Modal */}
            {showGenerateModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg w-1/2 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Generate New Report</h3>
                    <button
                      onClick={() => setShowGenerateModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Report Type</label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="progress">Progress Report</option>
                        <option value="documentation">Documentation Report</option>
                        <option value="assessment">Assessment Report</option>
                        <option value="diagnostic">Diagnostic Report</option>
                        <option value="treatment">Treatment Report</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowGenerateModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? "Generating..." : "Generate Report"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Report View Modal */}
            {showReportModal && selectedReport && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-lg w-3/4 max-h-[80vh] overflow-y-auto p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">{getReportTitle(selectedReport)}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                      >
                        <PrinterIcon className="w-4 h-4" />
                        Print
                      </button>
                      <button
                        onClick={() => setShowReportModal(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                  <div className="prose max-w-none print:prose-sm">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <strong>Date Created:</strong> {formatDate(selectedReport.createdAt)}
                      </div>
                      <div>
                        <strong>Created By:</strong> {selectedReport.createdBy?.name || "Unknown"}
                      </div>
                      <div>
                        <strong>Report Period:</strong> {formatDate(selectedReport.startDate)} to{" "}
                        {formatDate(selectedReport.endDate)}
                      </div>
                      <div>
                        <strong>Type:</strong>{" "}
                        {selectedReport.type.charAt(0).toUpperCase() + selectedReport.type.slice(1)}
                      </div>
                    </div>
                    <div className="mb-4">
                      <strong>Content:</strong>
                      <pre className="mt-2 p-4 bg-gray-50 rounded overflow-x-auto print:bg-white print:border print:border-gray-200">
                        {JSON.stringify(selectedReport.content, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "insights" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Clinical Insights</h2>
            <ClientInsights clientId={client._id} />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Client Analytics</h2>
            <ClientAnalytics clientId={client._id} />
          </div>
        )}

        {activeTab === "ai-assistant" && (
          <div className="space-y-6">
            <p className="text-gray-600 mb-4">
              Use AI tools to help with assessment, treatment planning, and progress tracking.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <AIWorkflow
                  client={client}
                  updateFunction={() => {
                    fetchClient();
                  }}
                />
              </div>
              <div>
                <SessionPrepView clientId={client._id} />
              </div>
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
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Request New Consent
                </button>
              </div>

              <div className="space-y-4">
                {client.consentForms?.map((form) => (
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
                      {form.signedAt && (
                        <p>Signed on {new Date(form.signedAt).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                ))}
                {(!client.consentForms || client.consentForms.length === 0) && (
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
                      className="text-blue-600 hover:underline"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      <pre className="whitespace-pre-wrap text-sm">{consentFormContent}</pre>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Document (PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setConsentFormFile(e.target.files[0])}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={consentFormNotes}
                    onChange={(e) => setConsentFormNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
