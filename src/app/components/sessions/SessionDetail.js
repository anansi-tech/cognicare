"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SessionForm from "./SessionForm";
import SessionAIInsights from "./SessionAIInsights";
import { useLiam } from "@/components/liam/LiamProvider";
import { AutoSessionPrep } from "@/components/ai/AutoSessionPrep";
import { AutoPostSession } from "@/components/ai/AutoPostSession";
import { SessionNote } from "@/components/sessions/SessionNote";
import { MeasuresPanel } from "@/components/measures/MeasuresPanel";

export default function SessionDetail({ sessionId }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [aiRefreshKey, setAiRefreshKey] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelApplyToFuture, setCancelApplyToFuture] = useState(false);
  const [cancelMode, setCancelMode] = useState("cancel"); // "cancel" | "noshow" | "delete"
  const [cancelBusy, setCancelBusy] = useState(false);
  const { bindClient } = useLiam();

  useEffect(() => {
    if (!sessionId) return;
    fetchSession();
  }, [sessionId]);

  // Bind LIAM to this session's client.
  useEffect(() => {
    const c = session?.clientId;
    if (!c) return;
    const id = typeof c === "object" ? (c._id ?? c.id) : c;
    const name = typeof c === "object" ? (c.name ?? "") : "";
    if (id) bindClient(id, name);
  }, [session?.clientId, bindClient]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/sessions/${sessionId}`);

      // Check if the response is empty
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from server");
      }

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.error("Response Text:", text);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch session");
      }

      console.log("Session data updated:", data);
      setSession(data);
    } catch (err) {
      console.error("Error fetching session:", err);
      setError(err.message || "Error loading session");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
    fetchSession();
  };

  const openCancelDialog = (mode) => {
    setCancelMode(mode);
    setCancelReason("");
    setCancelApplyToFuture(false);
    setShowCancelDialog(true);
  };

  const submitCancelDialog = async () => {
    setCancelBusy(true);
    try {
      if (cancelMode === "delete") {
        const url = `/api/sessions/${sessionId}${
          cancelApplyToFuture && session?.seriesId ? "?applyToFuture=1" : ""
        }`;
        const response = await fetch(url, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || "Failed to delete session");
        }
        router.push("/sessions");
        return;
      }

      const newStatus = cancelMode === "noshow" ? "no-show" : "cancelled";
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          cancellationReason: cancelReason || undefined,
          applyToFuture:
            cancelApplyToFuture && newStatus === "cancelled" && !!session?.seriesId,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update session");
      }
      setShowCancelDialog(false);
      fetchSession();
    } catch (err) {
      setError(err.message || "Error updating session");
    } finally {
      setCancelBusy(false);
    }
  };

  // Format date for display — local time, 12-hour AM/PM.
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format duration in hours and minutes
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hour${hours > 1 ? "s" : ""} and ${remainingMinutes} minute${
          remainingMinutes > 1 ? "s" : ""
        }`
      : `${hours} hour${hours > 1 ? "s" : ""}`;
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-accent text-accent-foreground";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "no-show":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button
          onClick={() => fetchSession()}
          className="mt-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600">Session not found</p>
        <button
          onClick={() => router.push("/sessions")}
          className="mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
        >
          Back to Sessions
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Edit Session</h1>
        <SessionForm
          session={session}
          onSuccess={handleEditSuccess}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Session Details</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push("/sessions")}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
          >
            Edit
          </button>
          {session.status === "scheduled" && (
            <>
              <button
                onClick={() => openCancelDialog("noshow")}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
              >
                Mark no-show
              </button>
              <button
                onClick={() => openCancelDialog("cancel")}
                className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
              >
                Cancel
              </button>
            </>
          )}
          <button
            onClick={() => openCancelDialog("delete")}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {showCancelDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900">
              {cancelMode === "delete"
                ? "Delete session?"
                : cancelMode === "noshow"
                  ? "Mark as no-show"
                  : "Cancel session"}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {cancelMode === "delete"
                ? "This removes the appointment from the schedule. Cancellation history is lost."
                : cancelMode === "noshow"
                  ? "Records that the client did not show. Counts toward attendance signal."
                  : "Cancels this appointment. Add a reason for your records (optional)."}
            </p>
            {cancelMode !== "delete" && (
              <div className="mt-4">
                <label
                  htmlFor="cancelReason"
                  className="block text-sm font-medium text-gray-700"
                >
                  Reason {cancelMode === "noshow" ? "" : "(optional)"}
                </label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                  placeholder="e.g. Client called to reschedule"
                />
              </div>
            )}
            {session.seriesId &&
              (cancelMode === "cancel" || cancelMode === "delete") && (
                <label className="mt-4 flex items-start gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={cancelApplyToFuture}
                    onChange={(e) => setCancelApplyToFuture(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
                  />
                  <span>
                    Also{" "}
                    {cancelMode === "delete" ? "delete" : "cancel"} every future
                    scheduled session in this series.
                  </span>
                </label>
              )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="px-3 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                disabled={cancelBusy}
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitCancelDialog}
                disabled={cancelBusy}
                className={`px-3 py-2 text-sm rounded text-white disabled:opacity-60 ${
                  cancelMode === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : cancelMode === "noshow"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-amber-700 hover:bg-amber-800"
                }`}
              >
                {cancelBusy
                  ? "Saving…"
                  : cancelMode === "delete"
                    ? cancelApplyToFuture
                      ? "Delete series from here"
                      : "Delete this one"
                    : cancelMode === "noshow"
                      ? "Mark no-show"
                      : cancelApplyToFuture
                        ? "Cancel this and future"
                        : "Cancel this one"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Basic Session Info */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Session Information</h2>
              <dl className="divide-y divide-gray-200">
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Client</dt>
                  <dd className="text-sm text-gray-900 col-span-2">
                    {session.clientId ? (
                      <Link
                        href={`/clients/${session.clientId._id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        {session.clientId.name}
                      </Link>
                    ) : (
                      "Unknown Client"
                    )}
                  </dd>
                </div>
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{formatDate(session.date)}</dd>
                </div>
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Duration</dt>
                  <dd className="text-sm text-gray-900 col-span-2">
                    {formatDuration(session.duration)}
                  </dd>
                </div>
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="text-sm text-gray-900 col-span-2 capitalize">{session.type}</dd>
                </div>
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Format</dt>
                  <dd className="text-sm text-gray-900 col-span-2 capitalize">{session.format}</dd>
                </div>
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="text-sm col-span-2">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        session.status
                      )}`}
                    >
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Additional Session Details */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Session Details</h2>
              <dl className="divide-y divide-gray-200">
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900 col-span-2">
                    {formatDate(session.createdAt)}
                  </dd>
                </div>
                <div className="py-2 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="text-sm text-gray-900 col-span-2">
                    {formatDate(session.updatedAt)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Measures — clinical data capture, before the AI output */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Measures</h2>
            <MeasuresPanel
              clientId={typeof session.clientId === "object" ? session.clientId?._id : session.clientId}
              sessionId={session._id}
              compact
            />
          </div>

          {/* Session Notes */}
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Session Notes</h2>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <p className="text-sm text-gray-900 whitespace-pre-line">
                {session.notes || "No notes recorded for this session."}
              </p>
            </div>
          </div>
        </div>

        {/* AI Insights Section */}
        <div id="ai-insights-section" className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold">AI Insights</h2>
            {session.status === "completed" && (
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Analysis Available
              </span>
            )}
          </div>
          <div className="mb-4 space-y-2">
            <AutoSessionPrep
              clientId={typeof session.clientId === "object" ? session.clientId?._id : session.clientId}
              sessionId={session._id}
              sessionStatus={session.status}
              onDone={() => setAiRefreshKey((k) => k + 1)}
            />
            <AutoPostSession
              clientId={typeof session.clientId === "object" ? session.clientId?._id : session.clientId}
              sessionId={session._id}
              sessionStatus={session.status}
              onDone={() => setAiRefreshKey((k) => k + 1)}
            />
          </div>
          {!isEditing && <SessionNote sessionId={session._id} refreshKey={aiRefreshKey} />}
          {!isEditing && (
            <div className="mt-6">
              <SessionAIInsights session={session} refreshKey={aiRefreshKey} focus="session" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
