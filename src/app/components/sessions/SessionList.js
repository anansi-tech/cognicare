"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SessionForm from "./SessionForm";
import { useSession } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_PILL = {
  "scheduled":   { bg: "#E2F4F2", color: "#158A98",  label: "Scheduled" },
  "in-progress": { bg: "#FBF2DA", color: "#A9821F",  label: "In progress" },
  "completed":   { bg: "#E7F6EC", color: "#3B9E57",  label: "Completed" },
  "cancelled":   { bg: "#EEF1F5", color: "#6E7E97",  label: "Cancelled" },
  "no-show":     { bg: "#FDE8E8", color: "#C0392B",  label: "No show" },
};

const STATUS_SEGMENTS = [
  { value: "",            label: "All" },
  { value: "scheduled",  label: "Scheduled" },
  { value: "in-progress",label: "In progress" },
  { value: "completed",  label: "Completed" },
  { value: "cancelled",  label: "Cancelled" },
  { value: "no-show",    label: "No show" },
];

const SELECT_STYLE = {
  border: "1px solid #DCE6F3",
  borderRadius: 12,
  padding: "8px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  color: "#0B2B6B",
  background: "#fff",
  outline: "none",
};

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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

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

  // Filter sessions client-side, then sort: upcoming first (asc), past next (desc)
  const filteredSessions = useMemo(() => {
    const filtered = allSessions.filter((s) => {
      const matchesSearch =
        searchTerm === "" ||
        (s.clientId?.name && s.clientId.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "" || s.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesType =
        typeFilter === "" || s.type.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesType;
    });
    const now = Date.now();
    const upcoming = filtered
      .filter((s) => new Date(s.date).getTime() >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const past = filtered
      .filter((s) => new Date(s.date).getTime() < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return [...upcoming, ...past];
  }, [allSessions, searchTerm, statusFilter, typeFilter]);

  const handleSessionAdded = (newSession) => {
    setShowAddSession(false);
    fetchAllSessions();
    if (newSession && newSession._id) {
      router.push(`/sessions/${newSession._id}`);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete session");
      }
      fetchAllSessions();
    } catch (err) {
      console.error("Error deleting session:", err);
      setError(err.message || "Error deleting session");
    }
  };

  const tz = session?.user?.practiceTimezone ?? "America/New_York";

  // Format date for display — practice timezone, 12-hour AM/PM.
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (!session || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Spinner size={40} />
        <p className="text-sm text-muted-foreground">Loading sessions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "16px 20px", color: "#B91C1C", fontSize: 14 }}>
        <strong>Error: </strong>{error}
        <button
          onClick={fetchAllSessions}
          className="ml-3 rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-700 hover:bg-red-200 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
            Sessions
          </p>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
            Your sessions
            {allSessions.length > 0 && (
              <span style={{ fontSize: 17, fontWeight: 500, color: "#8298BC", marginLeft: 10 }}>
                {allSessions.length}
              </span>
            )}
          </h1>
        </div>
        <button
          onClick={() => setShowAddSession(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New session
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="#8298BC" strokeWidth="2" strokeLinecap="round"
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by client or notes…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #DCE6F3", borderRadius: 12, padding: "8px 12px 8px 34px", fontSize: 14, fontFamily: "inherit", color: "#0B2B6B", background: "#fff", outline: "none" }}
          />
        </div>

        {/* Status segmented control */}
        <div style={{ display: "flex", gap: 4, background: "#F2F7FD", border: "1px solid #E3ECF7", borderRadius: 12, padding: 3, flexWrap: "wrap" }}>
          {STATUS_SEGMENTS.map((seg) => (
            <button
              key={seg.value}
              type="button"
              onClick={() => setStatusFilter(seg.value)}
              style={{
                padding: "5px 11px",
                borderRadius: 9,
                border: "none",
                fontSize: 13,
                fontWeight: statusFilter === seg.value ? 700 : 500,
                cursor: "pointer",
                transition: "all 150ms",
                background: statusFilter === seg.value ? "#EAF3FF" : "transparent",
                color: statusFilter === seg.value ? "#2F80FF" : "#55698F",
                whiteSpace: "nowrap",
              }}
            >
              {seg.label}
            </button>
          ))}
        </div>

        {/* Type select */}
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={SELECT_STYLE}>
          <option value="">All types</option>
          <option value="initial">Initial</option>
          <option value="followup">Follow-up</option>
          <option value="assessment">Assessment</option>
          <option value="crisis">Crisis</option>
          <option value="group">Group</option>
          <option value="family">Family</option>
        </select>
      </div>

      {/* Table card */}
      {filteredSessions.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, padding: "52px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#55698F" }}>
            {allSessions.length === 0
              ? "No sessions yet. Schedule a new session to get started."
              : "No sessions match your filters."}
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, overflow: "hidden", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F6FAFE", borderBottom: "1px solid #E3ECF7" }}>
                  {["Client", "Date & time", "Type", "Format", "Status", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 20px",
                        textAlign: "left",
                        fontSize: 11.5,
                        fontWeight: 700,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: "#8298BC",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s, idx) => {
                  const pill = STATUS_PILL[s.status] ?? { bg: "#EEF1F5", color: "#6E7E97", label: s.status };
                  return (
                    <tr
                      key={s._id}
                      style={{ borderTop: idx > 0 ? "1px solid #E3ECF7" : "none" }}
                      className="hover:bg-[#F5F9FE] transition-colors"
                    >
                      {/* Client */}
                      <td style={{ padding: "13px 20px", whiteSpace: "nowrap" }}>
                        {s.clientId ? (
                          <Link
                            href={`/clients/${s.clientId._id}`}
                            style={{ fontSize: 14, fontWeight: 600, color: "#0B2B6B", textDecoration: "none" }}
                            className="hover:text-primary transition-colors"
                          >
                            {s.clientId.name}
                          </Link>
                        ) : (
                          <span style={{ fontSize: 14, color: "#8298BC" }}>Unknown client</span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "13px 20px", fontSize: 13.5, color: "#55698F", whiteSpace: "nowrap" }}>
                        {formatDate(s.date)}
                      </td>

                      {/* Type */}
                      <td style={{ padding: "13px 20px", fontSize: 13.5, color: "#55698F", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        {s.type}
                      </td>

                      {/* Format */}
                      <td style={{ padding: "13px 20px", fontSize: 13.5, color: "#55698F", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                        {s.format}
                      </td>

                      {/* Status pill */}
                      <td style={{ padding: "13px 20px", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          background: pill.bg, color: pill.color,
                          fontWeight: 600, fontSize: 12.5,
                          padding: "3px 10px", borderRadius: 999,
                        }}>
                          {pill.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "13px 20px", whiteSpace: "nowrap" }}>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => router.push(`/sessions/${s._id}`)}
                            style={{ fontSize: 13.5, fontWeight: 600, color: "#2F80FF", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            className="hover:text-primary/70 transition-colors"
                          >
                            View →
                          </button>
                          <button
                            onClick={() => handleDeleteSession(s._id)}
                            style={{ fontSize: 13, color: "#C0392B", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                            className="hover:opacity-70 transition-opacity"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div style={{ padding: "10px 20px", borderTop: "1px solid #E3ECF7", background: "#F6FAFE" }}>
            <p style={{ fontSize: 13, color: "#8298BC", margin: 0 }}>
              Showing {filteredSessions.length} of {allSessions.length} session{allSessions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      {showAddSession && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,.5)" }}
          onClick={() => setShowAddSession(false)}
        >
          <div
            style={{
              background: "#FCFEFF",
              border: "1px solid #E3ECF7",
              borderRadius: 20,
              padding: "28px 28px 24px",
              width: "100%",
              maxWidth: 672,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 32px 64px -24px rgba(11,43,107,.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, color: "#0B2B6B", margin: 0 }}>
                New session
              </h2>
              <button
                onClick={() => setShowAddSession(false)}
                style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "50%", border: "none", background: "#F2F7FD", color: "#55698F", fontSize: 18, cursor: "pointer" }}
                className="hover:bg-[#E3ECF7] transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <SessionForm onSuccess={handleSessionAdded} onCancel={() => setShowAddSession(false)} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
