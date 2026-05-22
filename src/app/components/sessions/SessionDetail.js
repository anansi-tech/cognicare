"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SessionForm from "./SessionForm";
import SessionAIInsights from "./SessionAIInsights";
import AIWorkflow from "../clients/AIWorkflow";
import SessionAssistant from "./SessionAssistant";

export default function SessionDetail({ sessionId }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    fetchSession();
  }, [sessionId]);

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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

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
        throw new Error(data.message || "Failed to delete session");
      }

      router.push("/sessions");
    } catch (err) {
      console.error("Error deleting session:", err);
      setError(err.message || "Error deleting session");
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
        return "bg-blue-100 text-blue-800";
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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
        <div className="space-x-4">
          <button
            onClick={() => router.push("/sessions")}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

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
                        className="text-blue-600 hover:text-blue-800"
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
                {session.moodRating && (
                  <div className="py-2 grid grid-cols-3">
                    <dt className="text-sm font-medium text-gray-500">Client Mood Rating</dt>
                    <dd className="text-sm text-gray-900 col-span-2">{session.moodRating}/10</dd>
                  </div>
                )}
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
            {session.documented && (
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Analysis Available
              </span>
            )}
          </div>
          {!isEditing && <SessionAIInsights session={session} />}

          <div className="mt-8 border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <AIWorkflow
                  client={session.clientId}
                  session={session}
                  updateFunction={fetchSession}
                />
              </div>
              {/* <div>
                <SessionPrepView
                  clientId={session.clientId?._id || session.clientId}
                  sessionId={session._id}
                />
              </div> */}
            </div>
          </div>
        </div>
      </div>
      <SessionAssistant sessionId={sessionId} clientId={session.clientId} />
    </div>
  );
}
