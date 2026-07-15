"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";
import { avatarColors, initials } from "@/lib/avatar";

const CARD = { background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", overflow: "hidden" };
const CARD_HEAD = { display: "flex", alignItems: "center", gap: 10, padding: "18px 24px", borderBottom: "1px solid #EEF3FA" };
const H2 = { fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, letterSpacing: "-.01em", margin: 0, color: "#0B2B6B" };
const PILL = { fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" };
const AMBER = { background: "#FBF2DA", color: "#A9821F" };
const GREEN = { background: "#E7F6EC", color: "#3B9E57" };
const RED = { background: "#FDECEC", color: "#C0392B" };
const SLATE = { background: "#EEF1F5", color: "#6E7E97" };

// Presentation map for review-queue items — the pill only NAVIGATES; the
// destructive flows (approve, regenerate + confirm) live on the linked pages.
function reviewPresentation(item) {
  const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  switch (item.type) {
    case "draft-note":
      return { title: "Session note — draft", dot: "#E3B341", pill: "Approve", pillStyle: AMBER, href: `/sessions/${item.sessionId}`, ctx: "session" };
    case "draft-report": {
      const title =
        item.reportType === "treatment"
          ? `Treatment plan v${item.version ?? 1} — draft`
          : item.reportType === "diagnostic"
            ? "Diagnostic impression — draft"
            : `${titleCase(item.reportType)} report — draft`;
      const href =
        item.reportType === "progress" && item.sessionId
          ? `/sessions/${item.sessionId}`
          : `/clients/${item.clientId}?tab=overview`;
      return { title, dot: "#E3B341", pill: "Approve", pillStyle: AMBER, href, ctx: item.sessionId ? "session" : "generated" };
    }
    case "stale-notes":
      return { title: "Notes changed since note & progress were generated", dot: "#C0392B", pill: "Regenerate?", pillStyle: AMBER, href: `/sessions/${item.sessionId}`, ctx: "session" };
    case "stale-plan":
      return { title: `Diagnosis changed since plan v${item.version ?? 1}`, dot: "#C0392B", pill: "Regenerate?", pillStyle: AMBER, href: `/clients/${item.clientId}?tab=overview`, ctx: "edited" };
    case "consent":
      return { title: "Consent form awaiting signature", dot: "#E3B341", pill: "Consent pending", pillStyle: AMBER, href: `/clients/${item.clientId}?tab=consent-billing`, ctx: "requested" };
    case "missing-notes":
      return { title: "Completed session missing notes", dot: "#8298BC", pill: "Add notes", pillStyle: SLATE, href: `/sessions/${item.sessionId}`, ctx: "session" };
    default:
      return null;
  }
}

const SIGNAL_PILL = {
  worsened: RED,
  overdue: AMBER,
  improved: GREEN,
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalClients: 0,
    recentActivity: [],
    activeSessions: 0,
    completedSessions: 0,
    reportsGenerated: 0,
    todaysAppointments: [],
    upcomingThisWeek: 0,
    reviewQueue: [],
    reviewTotal: 0,
    signals: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      const fetchStats = async () => {
        try {
          setIsLoading(true);
          const response = await fetch("/api/dashboard/stats");
          if (!response.ok) {
            throw new Error("Failed to fetch stats");
          }
          const data = await response.json();
          setStats((prev) => ({ ...prev, ...data }));
        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchStats();
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size={40} />
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleActivityClick = (activity) => {
    if (activity.type === "session") {
      router.push(`/sessions/${activity.id}`);
    } else if (activity.type === "report") {
      if (activity.clientId) {
        router.push(`/clients/${activity.clientId}/reports/${activity.id}/view`);
      }
    }
  };

  const tz = session?.user?.practiceTimezone ?? "America/New_York";

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const shortDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });

  const relativeDate = (dateString) => {
    const todayStr = new Date().toLocaleDateString("en-US", { timeZone: tz });
    const yesterdayStr = new Date(Date.now() - 86400000).toLocaleDateString("en-US", { timeZone: tz });
    const dStr = new Date(dateString).toLocaleDateString("en-US", { timeZone: tz });
    if (dStr === todayStr) return "Today";
    if (dStr === yesterdayStr) return "Yesterday";
    return shortDate(dateString);
  };

  const formatLabel = {
    "in-person": "In-person",
    video: "Video",
    phone: "Phone",
    chat: "Chat",
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  const eyebrow = new Date().toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" });
  const sessionsToday = stats.todaysAppointments.length;
  const reviewCount = stats.reviewTotal ?? stats.reviewQueue.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Page header */}
      <div style={{ marginBottom: 6 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
          {eyebrow}
        </p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p style={{ fontSize: 15.5, color: "#55698F", margin: "6px 0 0" }}>
          {sessionsToday} session{sessionsToday === 1 ? "" : "s"} today ·{" "}
          <a href="#review" style={{ color: "#2F80FF", textDecoration: "none" }}>
            {reviewCount} item{reviewCount === 1 ? "" : "s"} need{reviewCount === 1 ? "s" : ""} your review
          </a>
        </p>
      </div>

      {/* ===== Today's schedule ===== */}
      <div style={CARD}>
        <div style={{ ...CARD_HEAD, justifyContent: "space-between" }}>
          <h2 style={H2}>Today&apos;s schedule</h2>
          {stats.upcomingThisWeek > 0 && (
            <Link href="/sessions/calendar" style={{ fontSize: 13.5, fontWeight: 600, color: "#2F80FF", textDecoration: "none", flexShrink: 0 }}>
              {stats.upcomingThisWeek} more in the next 7 days →
            </Link>
          )}
        </div>
        {stats.todaysAppointments.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", fontSize: 14, color: "#8298BC" }}>
            No appointments today.
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {stats.todaysAppointments.map((a) => {
              const [avBg, avColor] = avatarColors(a.clientName);
              const prep = a.consentPending
                ? { label: "Consent pending", style: AMBER }
                : a.prepReady
                  ? { label: "Brief ready", style: GREEN }
                  : null;
              return (
                <li key={a.id} style={{ borderBottom: "1px solid #F2F6FB" }}>
                  <Link
                    href={`/sessions/${a.id}`}
                    className="flex items-center justify-between gap-4 hover:bg-[#F5F9FE] transition-colors duration-[130ms]"
                    style={{ padding: "15px 24px", textDecoration: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#0B2B6B", fontVariantNumeric: "tabular-nums", width: 72, flexShrink: 0 }}>
                        {formatTime(a.date)}
                      </span>
                      <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: "50%", background: avBg, color: avColor, fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>
                        {initials(a.clientName)}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14.5, fontWeight: 600, color: "#0B2B6B" }}>{a.clientName}</span>
                          {a.isFirstSession && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: "#E4F1FF", color: "#2F80FF" }}>
                              First session
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 12.5, color: "#8298BC" }}>
                          {a.type ? a.type.charAt(0).toUpperCase() + a.type.slice(1) : "Session"} · {formatLabel[a.format] || a.format}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {prep && <span style={{ ...PILL, ...prep.style }}>{prep.label}</span>}
                      <span style={{ color: "#C3D2E8" }}>›</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ===== Needs your review ===== */}
      <div id="review" style={CARD}>
        <div style={CARD_HEAD}>
          <h2 style={H2}>Needs your review</h2>
          {reviewCount > 0 && <span style={{ ...PILL, ...AMBER }}>{reviewCount}</span>}
        </div>
        {stats.reviewQueue.length === 0 ? (
          <div style={{ padding: "30px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#3B9E57", margin: 0 }}>You&apos;re all caught up.</p>
            <p style={{ fontSize: 12.5, color: "#8298BC", margin: "5px 0 0" }}>Nothing awaiting your sign-off.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {stats.reviewQueue.map((item, i) => {
              const p = reviewPresentation(item);
              if (!p) return null;
              return (
                <li key={`${item.type}-${item.reportId ?? item.sessionId ?? item.clientId}-${i}`} style={{ borderBottom: "1px solid #F2F6FB" }}>
                  <Link
                    href={p.href}
                    className="flex items-center justify-between gap-4 hover:bg-[#F5F9FE] transition-colors duration-[130ms]"
                    style={{ padding: "14px 24px", textDecoration: "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                      <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: p.dot }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#0B2B6B" }}>{p.title}</div>
                        <div style={{ fontSize: 12.5, color: "#8298BC", marginTop: 1 }}>
                          {item.clientName} · {p.ctx} {shortDate(item.date)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ ...PILL, ...p.pillStyle }}>{p.pill}</span>
                      <span style={{ color: "#C3D2E8" }}>›</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ===== Client signals ===== */}
      {stats.signals.length > 0 && (
        <div style={CARD}>
          <div style={{ ...CARD_HEAD, alignItems: "baseline" }}>
            <h2 style={H2}>Client signals</h2>
            <span style={{ fontSize: 12, color: "#8298BC" }}>From measure trends — informational</span>
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {stats.signals.map((g, i) => (
              <li key={`${g.clientId}-${i}`} style={{ borderBottom: "1px solid #F2F6FB" }}>
                <Link
                  href={`/clients/${g.clientId}?tab=progress`}
                  className="flex items-center justify-between gap-4 hover:bg-[#F5F9FE] transition-colors duration-[130ms]"
                  style={{ padding: "13px 24px", textDecoration: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 6, minWidth: 88, textAlign: "center", ...(SIGNAL_PILL[g.severity] ?? SLATE) }}>
                      {g.severity}
                    </span>
                    <span style={{ fontSize: 13.5, color: "#24344F" }}>
                      <strong style={{ color: "#0B2B6B" }}>{g.clientName}</strong> — {g.text}
                    </span>
                  </div>
                  <span style={{ color: "#C3D2E8", flexShrink: 0 }}>›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ===== Practice pulse (compact strip) ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 12 }}>
        {[
          { n: stats.totalClients, label: "active clients", href: "/clients" },
          { n: stats.activeSessions, label: "upcoming sessions", href: "/sessions" },
          { n: stats.completedSessions, label: "completed", href: "/sessions?status=completed" },
          { n: stats.reportsGenerated, label: "reports", href: "/reports" },
        ].map((p) => (
          <Link
            key={p.label}
            href={p.href}
            className="hover:border-[#C7DCF5] transition-colors"
            style={{ display: "flex", alignItems: "baseline", gap: 9, background: "#fff", border: "1px solid #E3ECF7", borderRadius: 14, padding: "13px 16px", textDecoration: "none" }}
          >
            <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, color: "#0B2B6B" }}>{p.n}</span>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "#8298BC" }}>{p.label}</span>
          </Link>
        ))}
      </div>

      {/* ===== Recent activity (slim) ===== */}
      <div style={CARD}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #EEF3FA" }}>
          <h2 style={{ ...H2, fontSize: 15 }}>Recent activity</h2>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {stats.recentActivity.map((activity, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-4 hover:bg-[#F5F9FE] transition-colors duration-[130ms] cursor-pointer"
              style={{ padding: "11px 24px", borderBottom: "1px solid #F2F6FB" }}
              onClick={() => handleActivityClick(activity)}
            >
              <span style={{ fontSize: 13.5, color: "#41557A", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activity.type === "report"
                  ? `${activity.reportType ? activity.reportType.charAt(0).toUpperCase() + activity.reportType.slice(1) + " report" : "Report"} generated for ${activity.clientName}`
                  : `Session ${activity.status === "completed" ? "completed" : activity.status === "scheduled" ? "scheduled" : "updated"} with ${activity.clientName}`}
              </span>
              <span style={{ fontSize: 12, color: "#A6B8D4", flexShrink: 0 }}>{relativeDate(activity.date)}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
