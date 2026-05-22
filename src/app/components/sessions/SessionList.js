"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SessionForm from "./SessionForm";
import { useSession } from "next-auth/react";

export default function SessionList({ initialStatusFilter = "" }) {
  const [allSessions, setAllSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [typeFilter, setTypeFilter] = useState("");
  const [showAddSession, setShowAddSession] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  // Only fetch all sessions once on component mount and when session is available
  useEffect(() => {
    if (session) {
      fetchAllSessions();
    }
  }, [session]);

  // Update status filter when initialStatusFilter changes
  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const fetchAllSessions = async () => {
    try {
      setLoading(true);

      console.log("Fetching sessions...");
      const response = await fetch("/api/sessions", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
      });

      // Debug information
      console.log("Response status:", response.status);

      if (!response.ok) {
        let errorMessage = "Failed to fetch sessions";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Fetched sessions:", data.length);
      setAllSessions(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err.message || "Error loading sessions");
    } finally {
      setLoading(false);
    }
  };

  // Filter sessions client-side
  const filteredSessions = useMemo(() => {
    return allSessions.filter((session) => {
      // Apply search filter (case-insensitive)
      const matchesSearch =
        searchTerm === "" ||
        (session.clientId?.name &&
          session.clientId.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (session.notes && session.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      // Apply status filter
      const matchesStatus =
        statusFilter === "" || session.status.toLowerCase() === statusFilter.toLowerCase();

      // Apply type filter
      const matchesType =
        typeFilter === "" || session.type.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allSessions, searchTerm, statusFilter, typeFilter]);

  const handleSessionAdded = (newSession) => {
    setShowAddSession(false);
    fetchAllSessions(); // Refresh all sessions

    // Navigate to the session details page if we have a session ID
    if (newSession && newSession._id) {
      router.push(`/sessions/${newSession._id}`);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete session");
      }

      fetchAllSessions(); // Refresh the list
    } catch (err) {
      console.error("Error deleting session:", err);
      setError(err.message || "Error deleting session");
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
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

  // Show loading when session is loading or not yet available
  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
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
          onClick={fetchAllSessions}
          className="mt-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <button
          onClick={() => setShowAddSession(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          New Session
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by client name or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no-show">No Show</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Types</option>
          <option value="initial">Initial</option>
          <option value="followup">Follow-up</option>
          <option value="assessment">Assessment</option>
          <option value="crisis">Crisis</option>
          <option value="group">Group</option>
          <option value="family">Family</option>
        </select>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {allSessions.length === 0
              ? "No sessions found. Add a new session to get started."
              : "No sessions match your search criteria."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <tr key={session._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {session.clientId ? (
                      <Link
                        href={`/clients/${session.clientId._id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {session.clientId.name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Unknown Client</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(session.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{session.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{session.format}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                        session.status
                      )}`}
                    >
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => router.push(`/sessions/${session._id}`)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session._id)}
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
      )}

      {/* Add Session Modal */}
      {showAddSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">New Session</h2>
              <button
                onClick={() => setShowAddSession(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            <SessionForm onSuccess={handleSessionAdded} onCancel={() => setShowAddSession(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
