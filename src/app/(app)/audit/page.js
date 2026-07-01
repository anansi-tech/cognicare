"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Audit log viewer — owner-only, practice-scoped. Read-only view for
// non-owners (mirrors /billing's "ask your owner" pattern at billing/page.js:84).
// The /api/audit endpoint enforces the same gate server-side; the client gate
// is just to render a useful state.

const ACTIONS = ["login", "logout", "create", "read", "update", "delete", "export", "import", "access_denied"];
const ENTITY_TYPES = ["user", "client", "session", "invoice", "document", "report", "settings", "practice"];

const ACTION_TONE = {
  delete: "text-destructive font-medium",
  access_denied: "text-destructive font-medium",
  create: "text-foreground",
  update: "text-foreground",
  export: "text-foreground",
  import: "text-foreground",
  read: "text-muted-foreground",
  login: "text-muted-foreground",
  logout: "text-muted-foreground",
};

function formatActor(userRef) {
  if (!userRef) return "unknown";
  if (typeof userRef === "string") return userRef.slice(-6);
  return userRef.name || userRef.email || String(userRef._id || "").slice(-6);
}

function entityHref(entityType, entityId) {
  if (entityType === "client") return `/clients/${entityId}`;
  if (entityType === "session") return `/sessions/${entityId}`;
  return null;
}

const SELECT_STYLE = {
  border: "1px solid #DCE6F3",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "#0B2B6B",
  background: "#fff",
  outline: "none",
  width: "100%",
};

export default function AuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthed = status === "authenticated" && !!session?.user?.id;
  const isOwner = !!session?.user?.isPracticeOwner;

  const [clinicians, setClinicians] = useState([]);
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    entityType: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ logs: [], total: 0, page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (!isAuthed || !isOwner) return;
    (async () => {
      try {
        const res = await fetch("/api/practice/clinicians");
        if (res.ok) setClinicians(await res.json());
      } catch {
        // Filter is optional — non-fatal if it fails to load.
      }
    })();
  }, [isAuthed, isOwner]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.action) params.set("action", filters.action);
      if (filters.entityType) params.set("entityType", filters.entityType);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      params.set("page", String(page));
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (!res.ok) {
        setError(res.status === 403 ? "You don't have access to this practice's audit log." : "Could not load audit log.");
        setData({ logs: [], total: 0, page: 1, totalPages: 0 });
        return;
      }
      setData(await res.json());
    } catch {
      setError("Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (isAuthed && isOwner) fetchLogs();
  }, [isAuthed, isOwner, fetchLogs]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ userId: "", action: "", entityType: "", startDate: "", endDate: "" });
  };

  if (!isAuthed) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isOwner) {
    return (
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>Audit</p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          Audit log
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-prose">
          The audit log is managed by the practice owner. If you need a record of
          activity in this practice, please reach out to them.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
          Audit
        </p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          Audit log
        </h1>
        <p style={{ fontSize: 15, color: "#55698F", margin: "6px 0 0" }}>
          Every read, write, login, and access denial in this practice.
        </p>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 16, padding: "16px 20px", marginBottom: 16 }}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="block text-sm">
            <span style={{ fontSize: 12.5, color: "#55698F", fontWeight: 500 }}>Clinician</span>
            <select value={filters.userId} onChange={(e) => updateFilter("userId", e.target.value)} style={{ ...SELECT_STYLE, marginTop: 4 }}>
              <option value="">All</option>
              {clinicians.map((c) => (
                <option key={c._id} value={c._id}>{c.name || c.email}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span style={{ fontSize: 12.5, color: "#55698F", fontWeight: 500 }}>Action</span>
            <select value={filters.action} onChange={(e) => updateFilter("action", e.target.value)} style={{ ...SELECT_STYLE, marginTop: 4 }}>
              <option value="">All</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span style={{ fontSize: 12.5, color: "#55698F", fontWeight: 500 }}>Entity</span>
            <select value={filters.entityType} onChange={(e) => updateFilter("entityType", e.target.value)} style={{ ...SELECT_STYLE, marginTop: 4 }}>
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span style={{ fontSize: 12.5, color: "#55698F", fontWeight: 500 }}>From</span>
            <input type="date" value={filters.startDate} onChange={(e) => updateFilter("startDate", e.target.value)} style={{ ...SELECT_STYLE, marginTop: 4 }} />
          </label>
          <label className="block text-sm">
            <span style={{ fontSize: 12.5, color: "#55698F", fontWeight: 500 }}>To</span>
            <input type="date" value={filters.endDate} onChange={(e) => updateFilter("endDate", e.target.value)} style={{ ...SELECT_STYLE, marginTop: 4 }} />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-xl border border-[#DCE6F3] bg-white px-3 py-[7px] text-sm text-[#55698F] hover:bg-[#F2F7FD] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, overflow: "hidden", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
        <table className="min-w-full divide-y divide-[#E3ECF7]">
          <thead style={{ background: "#F2F7FD" }}>
            <tr>
              {["When", "Who", "Action", "Entity", "IP"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#55698F]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3ECF7]">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-destructive">{error}</td>
              </tr>
            )}
            {!loading && !error && data.logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">No audit events match these filters.</td>
              </tr>
            )}
            {!loading && !error && data.logs.map((log) => {
              const href = entityHref(log.entityType, log.entityId);
              const tone = ACTION_TONE[log.action] || "text-foreground";
              return (
                <tr key={log._id} className="hover:bg-[#F5F9FE] transition-colors">
                  <td className="px-4 py-2.5 text-sm text-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-US", { timeZone: session?.user?.practiceTimezone ?? "America/New_York" })}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-foreground">{formatActor(log.userId)}</td>
                  <td className={`px-4 py-2.5 text-sm ${tone}`}>{log.action}</td>
                  <td className="px-4 py-2.5 text-sm">
                    {href ? (
                      <Link href={href} className="text-primary hover:underline">
                        {log.entityType} #{String(log.entityId).slice(-6)}
                      </Link>
                    ) : (
                      <span className="text-foreground">{log.entityType} #{String(log.entityId).slice(-6)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{log.ipAddress}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span style={{ fontSize: 13.5, color: "#55698F" }}>
            Page {data.page} of {data.totalPages} · {data.total} events
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-[#DCE6F3] bg-white px-4 py-1.5 text-sm text-[#55698F] hover:bg-[#F2F7FD] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="rounded-xl border border-[#DCE6F3] bg-white px-4 py-1.5 text-sm text-[#55698F] hover:bg-[#F2F7FD] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
