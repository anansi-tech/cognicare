"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import InlineSessionEditor from "./InlineSessionEditor";
import SessionAIInsights from "./SessionAIInsights";
import { useLiam } from "@/components/liam/LiamProvider";
import { AutoSessionPrep } from "@/components/ai/AutoSessionPrep";
import { AutoPostSession } from "@/components/ai/AutoPostSession";
import { RegenerateButton } from "@/components/ai/RegenerateButton";
import { IconButton, PencilIcon } from "@/components/ai/editable";
import { SessionNote } from "@/components/sessions/SessionNote";
import { MeasuresPanel } from "@/components/measures/MeasuresPanel";
import { RiskBanners } from "@/components/measures/RiskBanners";
import { Spinner } from "@/components/ui/Spinner";
import { avatarColors, initials } from "@/lib/avatar";

const STATUS_PILL = {
  completed: { bg: "#E7F6EC", color: "#3B9E57" },
  scheduled: { bg: "#E2F4F2", color: "#158A98" },
  "in-progress": { bg: "#FBF2DA", color: "#A9821F" },
  cancelled: { bg: "#EEF1F5", color: "#6E7E97" },
  "no-show": { bg: "#FDECEC", color: "#C0392B" },
};

function InfoRow({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "0 12px", padding: "9px 0", borderTop: "1px solid #F2F6FB", alignItems: "start" }}>
      <span style={{ fontSize: 12.5, color: "#8298BC", fontWeight: 500, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13.5, color: "#24344F", fontWeight: 500 }}>{children}</span>
    </div>
  );
}

const CARD = { background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", padding: "22px 24px" };
const SECTION_H2 = { fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 15, color: "#0B2B6B", margin: "0 0 2px" };
const GHOST_BTN = { border: "1px solid #DCE6F3", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#55698F", fontWeight: 600, fontSize: 13.5, padding: "9px 16px", borderRadius: 10 };
const DANGER_BTN = { border: "1px solid #F3D2D2", cursor: "pointer", fontFamily: "inherit", background: "#fff", color: "#C0392B", fontWeight: 600, fontSize: 13.5, padding: "9px 16px", borderRadius: 10 };

export default function SessionDetail({ sessionId }) {
  const router = useRouter();
  const { data: authSession } = useSession();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [aiRefreshKey, setAiRefreshKey] = useState(0);
  const [riskRefreshKey, setRiskRefreshKey] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelApplyToFuture, setCancelApplyToFuture] = useState(false);
  const [cancelMode, setCancelMode] = useState("cancel"); // "cancel" | "noshow" | "delete"
  const [cancelBusy, setCancelBusy] = useState(false);
  // Session-notes staleness (R54 session edge) — fed by SessionAIInsights,
  // rendered as the regenerate nudge above the SOAP note.
  const [notesStale, setNotesStale] = useState(false);
  const handleNotesStale = useCallback((v) => setNotesStale(v), []);
  const [staleRegenBusy, setStaleRegenBusy] = useState(false);
  const [staleRegenError, setStaleRegenError] = useState(null);
  // Session-v3 rail: report states (fed by SessionAIInsights, display only),
  // scroll-spy active section, single-column fallback breakpoint.
  const [sessionReports, setSessionReports] = useState({});
  const handleReportsChange = useCallback((r) => setSessionReports(r), []);
  const [activeSection, setActiveSection] = useState("sec-info");
  const [isNarrow, setIsNarrow] = useState(false);
  const { bindClient, releaseClient } = useLiam();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1000px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Scroll-spy for the rail — same mechanics as the client Overview v2.
  useEffect(() => {
    if (isEditing) return;
    const ids = ["sec-info", "sec-note", "sec-treatment", "sec-progress"];
    const onScroll = () => {
      const y = window.scrollY + 150;
      let cur = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= y) cur = id;
      }
      setActiveSection((prev) => (prev === cur ? prev : cur));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isEditing]);

  const goToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    // −84: clear the sticky navbar (~64px) plus breathing room.
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: "smooth" });
  };

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
    if (!id) return;
    bindClient(id, name);
    return () => releaseClient(id);
  }, [session?.clientId, bindClient, releaseClient]);

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

  // Same endpoint + confirm as RegenerateButton — the nudge is just a second
  // door to that one action. Old reports survive a failure (generate-first).
  const regenerateFromNotes = async () => {
    const confirmed = window.confirm(
      "Regenerate will replace the current session note and progress report, including any edits you've approved. This can't be undone. Continue?"
    );
    if (!confirmed) return;
    setStaleRegenBusy(true);
    setStaleRegenError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session._id }),
      });
      if (!res.ok) {
        setStaleRegenError(
          (await res.json().catch(() => null))?.error ??
            "Regeneration failed — your previous reports are unchanged."
        );
        return;
      }
      setAiRefreshKey((k) => k + 1);
    } catch {
      setStaleRegenError("Regeneration failed — your previous reports are unchanged.");
    } finally {
      setStaleRegenBusy(false);
    }
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

  const tz = authSession?.user?.practiceTimezone ?? "America/New_York";

  // Format date for display — practice timezone, 12-hour AM/PM.
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Header meta line: date · time (separated by ·)
  const formatDateMeta = (dateString) => {
    const date = new Date(dateString);
    const d = date.toLocaleDateString("en-US", { timeZone: tz, year: "numeric", month: "long", day: "numeric" });
    const t = date.toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true });
    return `${d} · ${t}`;
  };

  // Format duration in hours and minutes
  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hour${hours > 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`
      : `${hours} hour${hours > 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 240, gap: 14 }}>
        <Spinner size={40} />
        <span style={{ fontSize: 13.5, color: "#8298BC" }}>Loading session…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 520, margin: "32px auto", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "18px 20px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#C0392B", margin: "0 0 6px" }}>Error</p>
        <p style={{ fontSize: 13.5, color: "#7B2020", margin: "0 0 14px" }}>{error}</p>
        <button onClick={() => fetchSession()} style={DANGER_BTN}>Try again</button>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ maxWidth: 520, margin: "32px auto", background: "#FFFBF0", border: "1px solid #F5E0A0", borderRadius: 14, padding: "18px 20px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#A9821F", margin: "0 0 6px" }}>Session not found</p>
        <p style={{ fontSize: 13.5, color: "#6D5100", margin: "0 0 14px" }}>This session may have been deleted or you may not have access.</p>
        <button onClick={() => router.push("/sessions")} style={GHOST_BTN}>Back to sessions</button>
      </div>
    );
  }

  if (isEditing) {
    // Existing records edit inline (read-document + per-field pencils);
    // SessionForm remains the creation form only.
    return (
      <InlineSessionEditor
        session={session}
        onChanged={(saved) => setSession((prev) => ({ ...prev, ...saved, clientId: prev.clientId }))}
        onDone={handleEditSuccess}
      />
    );
  }

  const clientId = typeof session.clientId === "object" ? session.clientId?._id : session.clientId;
  const clientName = typeof session.clientId === "object" ? (session.clientId?.name ?? "") : "";
  const sessionType = session.type ? session.type.charAt(0).toUpperCase() + session.type.slice(1) : "Session";
  const pageTitle = clientName ? `${sessionType} with ${clientName}` : sessionType;
  const metaLine = session.date ? `${formatDateMeta(session.date)} · ${formatDuration(session.duration)}` : "";
  const sp = STATUS_PILL[session.status] ?? { bg: "#EEF1F5", color: "#6E7E97" };

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 32px 64px" }}>
      {/* Back link */}
      <Link
        href="/sessions"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: "#55698F", textDecoration: "none", marginBottom: 18 }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All sessions
      </Link>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase" }}>Session</div>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 30, letterSpacing: "-.025em", margin: "6px 0 0", color: "#0B2B6B" }}>{pageTitle}</h1>
          <p style={{ fontSize: 14.5, color: "#55698F", margin: "6px 0 0" }}>{metaLine}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          {session.status === "scheduled" && (
            <>
              <button onClick={() => openCancelDialog("noshow")} style={{ ...GHOST_BTN, color: "#A9821F", border: "1px solid #EEE0C0" }}>Mark no-show</button>
              <button onClick={() => openCancelDialog("cancel")} style={GHOST_BTN}>Cancel</button>
            </>
          )}
          <IconButton title="Edit session" onClick={() => setIsEditing(true)}>
            <PencilIcon size={15} />
          </IconButton>
          <IconButton title="Delete session" onClick={() => openCancelDialog("delete")} danger>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </IconButton>
        </div>
      </div>

      {/* Cancel / no-show / delete dialog */}
      {showCancelDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(11,43,107,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "26px 28px", maxWidth: 440, width: "100%", boxShadow: "0 20px 60px -10px rgba(11,43,107,.25)", margin: "0 16px" }}>
            <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, color: "#0B2B6B", margin: "0 0 6px" }}>
              {cancelMode === "delete" ? "Delete session?" : cancelMode === "noshow" ? "Mark as no-show" : "Cancel session"}
            </h3>
            <p style={{ fontSize: 13.5, color: "#55698F", margin: "0 0 16px", lineHeight: 1.55 }}>
              {cancelMode === "delete"
                ? "This removes the appointment from the schedule. Cancellation history is lost."
                : cancelMode === "noshow"
                  ? "Records that the client did not show. Counts toward attendance signal."
                  : "Cancels this appointment. Add a reason for your records (optional)."}
            </p>
            {cancelMode !== "delete" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#55698F", marginBottom: 6 }}>
                  Reason{cancelMode === "noshow" ? "" : " (optional)"}
                </label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Client called to reschedule"
                />
              </div>
            )}
            {session.seriesId && (cancelMode === "cancel" || cancelMode === "delete") && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#41557A", marginBottom: 14 }}>
                <input
                  type="checkbox"
                  checked={cancelApplyToFuture}
                  onChange={(e) => setCancelApplyToFuture(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-ring"
                />
                <span>Also {cancelMode === "delete" ? "delete" : "cancel"} every future scheduled session in this series.</span>
              </label>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelBusy}
                style={GHOST_BTN}
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitCancelDialog}
                disabled={cancelBusy}
                style={{
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: cancelMode === "delete" ? "#C0392B" : "#A9821F",
                  color: "#fff", fontWeight: 600, fontSize: 13.5, padding: "9px 16px", borderRadius: 10,
                  opacity: cancelBusy ? 0.6 : 1,
                }}
              >
                {cancelBusy
                  ? "Saving…"
                  : cancelMode === "delete"
                    ? cancelApplyToFuture ? "Delete series from here" : "Delete this one"
                    : cancelMode === "noshow"
                      ? "Mark no-show"
                      : cancelApplyToFuture ? "Cancel this and future" : "Cancel this one"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const shortDate = (iso) =>
          iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;
        const { treatment: tx, progress: px, documentation: doc } = sessionReports;
        const statusLabel = session.status.charAt(0).toUpperCase() + session.status.slice(1);
        const infoDot =
          session.status === "completed" ? "#3B9E57"
          : session.status === "cancelled" || session.status === "no-show" ? "#A6B8D4"
          : "#E3B341";
        const reportDot = (r) =>
          !r ? "#A6B8D4" : r.status === "draft" ? "#E3B341" : r.status === "approved" ? "#3B9E57" : "#A6B8D4";
        const navItems = [
          { id: "sec-info", label: "Session information", meta: `${statusLabel} · ${shortDate(session.date)}`, dot: infoDot },
          {
            id: "sec-note",
            label: "Session note",
            meta: !doc ? "Not yet generated" : doc.status === "draft" ? "Draft — not in record" : doc.status === "approved" ? "Approved · SOAP" : `Updated ${shortDate(doc.createdAt)}`,
            dot: reportDot(doc),
          },
          {
            id: "sec-treatment",
            label: `Treatment plan${tx?.version ? ` v${tx.version}` : ""}`,
            meta: !tx ? "Not yet generated" : `Client-scoped · ${tx.status === "approved" ? "Approved" : tx.status === "draft" ? "Draft — needs review" : `Updated ${shortDate(tx.createdAt)}`}`,
            dot: reportDot(tx),
          },
          {
            id: "sec-progress",
            label: "Progress report",
            meta: !px ? "Not yet generated" : px.status === "draft" ? "Draft — needs review" : px.status === "approved" ? `Approved · ${shortDate(px.createdAt)}` : `Updated ${shortDate(px.createdAt)}`,
            dot: reportDot(px),
          },
        ];

        const navCard = (
          <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 16, padding: 10, boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#8298BC", padding: "6px 10px 8px" }}>
              This session
            </div>
            {navItems.map((n) => {
              const active = activeSection === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => goToSection(n.id)}
                  className="hover:bg-[#F0F6FD] transition-colors"
                  style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", border: "none", textAlign: "left", fontFamily: "inherit", padding: "8px 10px", borderRadius: 9, cursor: "pointer", background: active ? "#EAF3FF" : "transparent" }}
                >
                  <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: n.dot }} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: active ? 700 : 600, color: active ? "#2F80FF" : "#33465F" }}>{n.label}</span>
                    <span style={{ display: "block", fontSize: 11, color: "#A6B8D4", marginTop: 1 }}>{n.meta}</span>
                  </span>
                </button>
              );
            })}
          </div>
        );

        const navChipsRow = (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {navItems.map((n) => {
              const active = activeSection === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => goToSection(n.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0, border: "1px solid #E3ECF7", borderRadius: 999, padding: "6px 13px", fontFamily: "inherit", fontSize: 12.5, fontWeight: active ? 700 : 600, cursor: "pointer", background: active ? "#EAF3FF" : "#fff", color: active ? "#2F80FF" : "#33465F", whiteSpace: "nowrap" }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: n.dot }} />
                  {n.label}
                </button>
              );
            })}
          </div>
        );

        const clientChip = session.clientId ? (
          <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 16, padding: "12px 14px", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)", display: "flex", alignItems: "center", gap: 11 }}>
            {(() => {
              const [bg, color] = avatarColors(clientName);
              return (
                <span style={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: "50%", background: bg, color, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {initials(clientName)}
                </span>
              );
            })()}
            <div style={{ minWidth: 0 }}>
              <Link href={`/clients/${clientId}`} style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#0B2B6B", textDecoration: "none" }} className="hover:text-primary transition-colors">
                {clientName}
              </Link>
              <Link href={`/clients/${clientId}`} style={{ fontSize: 11.5, color: "#8298BC", textDecoration: "none" }} className="hover:text-primary transition-colors">
                Open client record ›
              </Link>
            </div>
          </div>
        ) : null;

        // Notes-staleness nudge (R54 session edge) — the note + progress pair
        // was generated from notes that have since changed. Rendered between
        // the Session-note sticky header and its body (position only — the
        // render condition, copy, and regenerate wiring are unchanged).
        // Regeneration goes through the same endpoint and confirm as the
        // Regenerate button.
        const staleNudge =
          !isEditing && notesStale ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", margin: "12px 20px 0", background: "#FEF9EC", border: "1px solid #F6E6BC", borderRadius: 11, padding: "9px 14px" }}>
              <span style={{ fontSize: 12.5, color: "#7A6020", flex: 1, minWidth: 200 }}>
                Session notes changed since this note and progress were generated. Regenerate them? This replaces the current versions.
                {staleRegenError && <span style={{ display: "block", color: "#C0392B", marginTop: 3 }}>{staleRegenError}</span>}
              </span>
              <button
                type="button"
                onClick={regenerateFromNotes}
                disabled={staleRegenBusy}
                style={{ flexShrink: 0, border: "none", borderRadius: 8, background: "#A9821F", color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 700, padding: "6px 12px", cursor: staleRegenBusy ? "default" : "pointer", opacity: staleRegenBusy ? 0.6 : 1 }}
                className="hover:opacity-90 transition-opacity"
              >
                {staleRegenBusy ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          ) : null;

        const documentColumn = (
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            {/* Risk surfacing: elevated C-SSRS + PHQ-9 item-9 trigger (R55).
                An in-banner C-SSRS administration binds to this session. */}
            <RiskBanners
              clientId={clientId}
              sessionId={session._id}
              refreshKey={riskRefreshKey}
              onOpenSafetyPlan={() => router.push(`/clients/${clientId}?tab=overview`)}
            />

            {/* Session information — merged card */}
            <section id="sec-info" style={CARD}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
                <div>
                  <h2 style={SECTION_H2}>Session information</h2>
                  <InfoRow label="Client">
                    {session.clientId ? (
                      <Link
                        href={`/clients/${clientId}`}
                        style={{ color: "#0B2B6B", fontWeight: 600, textDecoration: "none" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#2F80FF")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#0B2B6B")}
                      >
                        {clientName}
                      </Link>
                    ) : (
                      "Unknown Client"
                    )}
                  </InfoRow>
                  <InfoRow label="Date & time">{formatDate(session.date)}</InfoRow>
                  <InfoRow label="Duration">{formatDuration(session.duration)}</InfoRow>
                  <InfoRow label="Type">{session.type ? session.type.charAt(0).toUpperCase() + session.type.slice(1) : "—"}</InfoRow>
                  <InfoRow label="Format">{session.format ? session.format.charAt(0).toUpperCase() + session.format.slice(1) : "—"}</InfoRow>
                  <InfoRow label="Status">
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 11px", borderRadius: 999, background: sp.bg, color: sp.color }}>
                      {statusLabel}
                    </span>
                  </InfoRow>
                </div>
                <div>
                  <h2 style={SECTION_H2}>Record details</h2>
                  <InfoRow label="Created">{formatDate(session.createdAt)}</InfoRow>
                  <InfoRow label="Last updated">{formatDate(session.updatedAt)}</InfoRow>
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <h2 style={SECTION_H2}>Measures</h2>
                <div style={{ marginBottom: 18 }}>
                  <MeasuresPanel
                    clientId={clientId}
                    sessionId={session._id}
                    compact
                    onSaved={() => setRiskRefreshKey((k) => k + 1)}
                  />
                </div>
                <h2 style={SECTION_H2}>Session notes</h2>
                <div style={{ background: "#F7FAFE", border: "1px solid #EEF3FA", borderRadius: 12, padding: "14px 16px", marginTop: 8 }}>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: session.notes ? "#41557A" : "#8298BC", margin: 0, whiteSpace: "pre-wrap" }}>
                    {session.notes || "No notes recorded for this session."}
                  </p>
                </div>
              </div>
            </section>

            {/* AI region — run-in header; the card wrapper dissolved, sections
                sit directly in the document column like Overview v2 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "2px 2px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 9, background: "#0B2B6B", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 512 512" fill="none">
                    <path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" stroke="#25B9C8" strokeWidth="46" strokeLinecap="round" />
                  </svg>
                </span>
                <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, letterSpacing: "-.01em", margin: 0, color: "#0B2B6B" }}>AI insights</h2>
                {session.status === "completed" && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 11px", borderRadius: 999, background: "#E7F6EC", color: "#3B9E57" }}>Analysis available</span>
                )}
              </div>
              {session.status === "completed" && (
                <RegenerateButton
                  clientId={clientId}
                  sessionId={session._id}
                  onDone={() => setAiRefreshKey((k) => k + 1)}
                />
              )}
            </div>

            {/* Auto-prep components */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <AutoSessionPrep
                clientId={clientId}
                sessionId={session._id}
                sessionStatus={session.status}
                onDone={() => setAiRefreshKey((k) => k + 1)}
              />
              <AutoPostSession
                clientId={clientId}
                sessionId={session._id}
                sessionStatus={session.status}
                onDone={() => setAiRefreshKey((k) => k + 1)}
              />
            </div>

            {!isEditing && <SessionNote sessionId={session._id} refreshKey={aiRefreshKey} id="sec-note" nudge={staleNudge} />}
            {!isEditing && (
              <SessionAIInsights session={session} refreshKey={aiRefreshKey} focus="session" onNotesStale={handleNotesStale} onReportsChange={handleReportsChange} />
            )}
          </div>
        );

        return isNarrow ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {navChipsRow}
            {documentColumn}
            {clientChip}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "252px minmax(0, 1fr)", gap: 24, alignItems: "start" }}>
            <div style={{ position: "sticky", top: 84, display: "flex", flexDirection: "column", gap: 14 }}>
              {navCard}
              {clientChip}
            </div>
            {documentColumn}
          </div>
        );
      })()}
    </div>
  );
}
