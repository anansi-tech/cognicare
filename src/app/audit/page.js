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
const ENTITY_TYPES = ["user", "client", "session", "invoice", "document", "report", "settings"];

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

  // Clinician dropdown source. Same endpoint as /team — auto practice-scoped.
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
      <div className="py-10 px-4 max-w-prose">
        <h1 className="text-2xl font-bold text-foreground">Audit log</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The audit log is managed by the practice owner. If you need a record of
          activity in this practice, please reach out to them.
        </p>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every read, write, login, and access denial in this practice.
        </p>
      </header>

      {/* Filters */}
      <div className="mb-4 rounded-lg border border-border bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="block text-sm">
            <span className="text-muted-foreground">Clinician</span>
            <select
              value={filters.userId}
              onChange={(e) => updateFilter("userId", e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {clinicians.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name || c.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Action</span>
            <select
              value={filters.action}
              onChange={(e) => updateFilter("action", e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Entity</span>
            <select
              value={filters.entityType}
              onChange={(e) => updateFilter("entityType", e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">From</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter("startDate", e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">To</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter("endDate", e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearFilters}
              className="w-full rounded-md border border-border bg-white px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-secondary">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">When</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-destructive">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && data.logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No audit events match these filters.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              data.logs.map((log) => {
                const href = entityHref(log.entityType, log.entityId);
                const tone = ACTION_TONE[log.action] || "text-foreground";
                return (
                  <tr key={log._id} className="hover:bg-secondary/50">
                    <td className="px-4 py-2 text-sm text-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-sm text-foreground">{formatActor(log.userId)}</td>
                    <td className={`px-4 py-2 text-sm ${tone}`}>{log.action}</td>
                    <td className="px-4 py-2 text-sm">
                      {href ? (
                        <Link href={href} className="text-primary hover:underline">
                          {log.entityType} #{String(log.entityId).slice(-6)}
                        </Link>
                      ) : (
                        <span className="text-foreground">
                          {log.entityType} #{String(log.entityId).slice(-6)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{log.ipAddress}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} events
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border bg-white px-3 py-1 text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="rounded-md border border-border bg-white px-3 py-1 text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
