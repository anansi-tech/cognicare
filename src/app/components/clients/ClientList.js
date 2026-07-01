"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClientForm from "./ClientForm";
import { useSession } from "next-auth/react";
import { ageFromDob, genderLabel } from "@/lib/age";
import { Spinner } from "@/components/ui/Spinner";

const AVATAR_COLORS = [
  ["#EAF3FF", "#2F80FF"],
  ["#E2F4F2", "#158A98"],
  ["#E7F6EC", "#3B9E57"],
  ["#FBF2DA", "#A9821F"],
  ["#F0EAFB", "#7C5CBF"],
];

function avatarColors(name = "") {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function initials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_PILL = {
  active:      { bg: "#E7F6EC", color: "#3B9E57", label: "Active" },
  completed:   { bg: "#E4F1FF", color: "#2F80FF", label: "Completed" },
  inactive:    { bg: "#EEF1F5", color: "#6E7E97", label: "Inactive" },
  transferred: { bg: "#FBF2DA", color: "#A9821F", label: "Transferred" },
};

const SEGMENTS = [
  { value: "",            label: "All" },
  { value: "active",      label: "Active" },
  { value: "inactive",    label: "Inactive" },
  { value: "completed",   label: "Completed" },
  { value: "transferred", label: "Transferred" },
];

export default function ClientList() {
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  // Fetch clients once when the session becomes authenticated. Depending on
  // `status` (a stable string) rather than the `session` object prevents
  // next-auth's on-focus session refetch from re-triggering this effect and
  // flipping `loading`, which would remount the Add-Client form and wipe input.
  useEffect(() => {
    if (status === "authenticated") {
      fetchAllClients();
    }
  }, [status]);

  const fetchAllClients = async () => {
    try {
      setLoading(true);

      console.log("Fetching clients...");
      const response = await fetch("/api/clients", {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        let errorMessage = "Failed to fetch clients";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("Fetched clients:", data.length);
      setAllClients(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError(err.message || "Error loading clients");
    } finally {
      setLoading(false);
    }
  };

  // Filter clients client-side
  const filteredClients = useMemo(() => {
    return allClients.filter((client) => {
      const matchesSearch =
        searchTerm === "" || client.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "" || client.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [allClients, searchTerm, statusFilter]);

  const handleClientAdded = (newClient) => {
    setShowAddClient(false);
    if (newClient && newClient._id) {
      sessionStorage.setItem("showClientReminderForId", newClient._id);
      router.push(`/clients/${newClient._id}`);
    }
  };

  if (!session || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Spinner size={40} />
        <p className="text-sm text-muted-foreground">Loading clients…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "16px 20px", color: "#B91C1C", fontSize: 14 }}>
        <strong>Error: </strong>{error}
        <button
          onClick={fetchAllClients}
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
            Clients
          </p>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
            Your clients
            {allClients.length > 0 && (
              <span style={{ fontSize: 17, fontWeight: 500, color: "#8298BC", marginLeft: 10 }}>
                {allClients.length}
              </span>
            )}
          </h1>
        </div>
        <button
          onClick={() => setShowAddClient(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add new client
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
            placeholder="Search clients…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1px solid #DCE6F3", borderRadius: 12,
              padding: "8px 12px 8px 34px",
              fontSize: 14, fontFamily: "inherit", color: "#0B2B6B",
              background: "#fff", outline: "none",
            }}
          />
        </div>

        {/* Segmented filter */}
        <div style={{ display: "flex", gap: 4, background: "#F2F7FD", border: "1px solid #E3ECF7", borderRadius: 12, padding: 3 }}>
          {SEGMENTS.map((seg) => (
            <button
              key={seg.value}
              type="button"
              onClick={() => setStatusFilter(seg.value)}
              style={{
                padding: "5px 13px",
                borderRadius: 9,
                border: "none",
                fontSize: 13,
                fontWeight: statusFilter === seg.value ? 700 : 500,
                cursor: "pointer",
                transition: "all 150ms",
                background: statusFilter === seg.value ? "#EAF3FF" : "transparent",
                color: statusFilter === seg.value ? "#2F80FF" : "#55698F",
              }}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      {filteredClients.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, padding: "52px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#55698F" }}>
            {allClients.length === 0
              ? "No clients yet. Add a new client to get started."
              : "No clients match your search."}
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, overflow: "hidden", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F6FAFE", borderBottom: "1px solid #E3ECF7" }}>
                  {["Name", "Age / Gender", "Status", "Last updated", ""].map((h) => (
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
                {filteredClients.map((client, idx) => {
                  const [avatarBg, avatarColor] = avatarColors(client.name);
                  const pill = STATUS_PILL[client.status] ?? { bg: "#EEF1F5", color: "#6E7E97", label: client.status };
                  return (
                    <tr
                      key={client._id}
                      style={{ borderTop: idx > 0 ? "1px solid #E3ECF7" : "none" }}
                      className="hover:bg-[#F5F9FE] transition-colors"
                    >
                      {/* Name + avatar */}
                      <td style={{ padding: "13px 20px", whiteSpace: "nowrap" }}>
                        <Link
                          href={`/clients/${client._id}`}
                          className="flex items-center gap-[10px] group"
                          style={{ textDecoration: "none" }}
                        >
                          <span style={{
                            display: "grid", placeItems: "center",
                            width: 34, height: 34, borderRadius: "50%",
                            background: avatarBg, color: avatarColor,
                            fontWeight: 700, fontSize: 12.5, flexShrink: 0,
                          }}>
                            {initials(client.name)}
                          </span>
                          <span
                            style={{ fontSize: 14, fontWeight: 600, color: "#0B2B6B" }}
                            className="group-hover:text-primary transition-colors"
                          >
                            {client.name}
                          </span>
                        </Link>
                      </td>

                      {/* Age / Gender */}
                      <td style={{ padding: "13px 20px", fontSize: 13.5, color: "#55698F", whiteSpace: "nowrap" }}>
                        {ageFromDob(client.dateOfBirth) ?? "—"} / {genderLabel(client.gender)}
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

                      {/* Last updated */}
                      <td style={{ padding: "13px 20px", fontSize: 13.5, color: "#8298BC", whiteSpace: "nowrap" }}>
                        {new Date(client.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "13px 20px", whiteSpace: "nowrap" }}>
                        <Link
                          href={`/clients/${client._id}`}
                          style={{ fontSize: 13.5, fontWeight: 600, color: "#2F80FF", textDecoration: "none" }}
                          className="hover:text-primary/70 transition-colors"
                        >
                          View →
                        </Link>
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
              Showing {filteredClients.length} of {allClients.length} client{allClients.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Add-client modal */}
      {showAddClient && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,.5)" }}
          onClick={() => setShowAddClient(false)}
        >
          <div
            style={{
              background: "#FCFEFF",
              border: "1px solid #E3ECF7",
              borderRadius: 20,
              padding: "28px 28px 24px",
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 32px 64px -24px rgba(11,43,107,.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, color: "#0B2B6B", margin: 0 }}>
                Add new client
              </h2>
              <button
                onClick={() => setShowAddClient(false)}
                style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: "50%", border: "none", background: "#F2F7FD", color: "#55698F", fontSize: 18, cursor: "pointer" }}
                className="hover:bg-[#E3ECF7] transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ClientForm onSuccess={handleClientAdded} onCancel={() => setShowAddClient(false)} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
