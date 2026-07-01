"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";

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
          setStats(data);
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

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formatLabel = {
    "in-person": "In person",
    video: "Video",
    phone: "Phone",
    chat: "Chat",
  };

  const getStatusPill = (s) => {
    switch (s?.toLowerCase()) {
      case "completed":   return "bg-[#E7F6EC] text-[#3B9E57]";
      case "scheduled":   return "bg-[#E4F1FF] text-[#2F80FF]";
      case "in-progress": return "bg-amber-50 text-amber-700";
      case "cancelled":   return "bg-red-50 text-red-600";
      default:            return "bg-secondary text-muted-foreground";
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  const CARD_STYLE = {
    background: "#fff",
    border: "1px solid #E9F0F9",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 20px 46px -40px rgba(11,43,107,.35)",
  };

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
          Overview
        </p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p style={{ fontSize: 15.5, color: "#55698F", margin: "6px 0 0" }}>
          Here&apos;s what&apos;s happening across your practice today.
        </p>
      </div>

      {/* Today's Schedule */}
      <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #EEF3FA" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, letterSpacing: "-.01em", margin: 0, color: "#0B2B6B" }}>
              Today&apos;s schedule
            </h2>
            <p style={{ fontSize: 12.5, color: "#8298BC", margin: "3px 0 0" }}>
              {new Date().toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          {stats.upcomingThisWeek > 0 && (
            <Link href="/sessions/calendar" style={{ fontSize: 13.5, fontWeight: 600, color: "#2F80FF", textDecoration: "none" }}>
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
            {stats.todaysAppointments.map((a) => (
              <li key={a.id} style={{ borderBottom: "1px solid #F2F6FB" }}>
                <Link
                  href={`/sessions/${a.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-[15px] hover:bg-[#F5F9FE] transition-colors duration-[130ms]"
                  style={{ textDecoration: "none" }}
                >
                  <div className="flex items-center min-w-0" style={{ gap: 18 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0B2B6B", fontVariantNumeric: "tabular-nums", width: 76, flexShrink: 0 }}>
                      {formatTime(a.date)}
                    </span>
                    <span style={{ fontSize: 14.5, color: "#2C3E5E", fontWeight: 500 }}>
                      {a.clientName}
                    </span>
                  </div>
                  <span style={{ fontSize: 12.5, color: "#8298BC", flexShrink: 0 }}>
                    {formatLabel[a.format] || a.format}
                    {a.type ? ` · ${a.type}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">

        <div className="transition-all duration-200 hover:-translate-y-[3px] hover:border-[#C7DCF5] hover:shadow-[0_26px_56px_-34px_rgba(11,43,107,.42)]" style={CARD_STYLE}>
          <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 13, background: "#EAF3FF" }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#2F80FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#8298BC", marginTop: 16 }}>Total clients</div>
          <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 30, color: "#0B2B6B", marginTop: 2 }}>
            {stats.totalClients}
          </div>
          <Link href="/clients" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#2F80FF", marginTop: 10, textDecoration: "none" }}>
            View all clients →
          </Link>
        </div>

        <div className="transition-all duration-200 hover:-translate-y-[3px] hover:border-[#C7DCF5] hover:shadow-[0_26px_56px_-34px_rgba(11,43,107,.42)]" style={CARD_STYLE}>
          <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 13, background: "#E2F4F2" }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#158A98" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#8298BC", marginTop: 16 }}>Active sessions</div>
          <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 30, color: "#158A98", marginTop: 2 }}>
            {stats.activeSessions}
          </div>
          <Link href="/sessions" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#2F80FF", marginTop: 10, textDecoration: "none" }}>
            View all sessions →
          </Link>
        </div>

        <div className="transition-all duration-200 hover:-translate-y-[3px] hover:border-[#C7DCF5] hover:shadow-[0_26px_56px_-34px_rgba(11,43,107,.42)]" style={CARD_STYLE}>
          <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 13, background: "#E7F6EC" }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#4DBB6A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#8298BC", marginTop: 16 }}>Completed sessions</div>
          <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 30, color: "#4DBB6A", marginTop: 2 }}>
            {stats.completedSessions}
          </div>
          <Link href="/sessions?status=completed" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#2F80FF", marginTop: 10, textDecoration: "none" }}>
            View completed →
          </Link>
        </div>

        <div className="transition-all duration-200 hover:-translate-y-[3px] hover:border-[#C7DCF5] hover:shadow-[0_26px_56px_-34px_rgba(11,43,107,.42)]" style={CARD_STYLE}>
          <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 13, background: "#E4F7FA" }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#1597A6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </span>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#8298BC", marginTop: 16 }}>Reports generated</div>
          <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 30, color: "#1597A6", marginTop: 2 }}>
            {stats.reportsGenerated}
          </div>
          <Link href="/reports" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#2F80FF", marginTop: 10, textDecoration: "none" }}>
            View all reports →
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: "#fff", border: "1px solid #E9F0F9", borderRadius: 20, boxShadow: "0 22px 50px -40px rgba(11,43,107,.4)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #EEF3FA" }}>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, letterSpacing: "-.01em", margin: 0, color: "#0B2B6B" }}>
            Recent activity
          </h2>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {stats.recentActivity.map((activity, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[#F5F9FE] transition-colors duration-[130ms] cursor-pointer"
              style={{ borderBottom: "1px solid #F2F6FB" }}
              onClick={() => handleActivityClick(activity)}
            >
              <div className="flex items-center min-w-0" style={{ gap: 14 }}>
                <span style={{
                  display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: activity.type === "session" ? "#E2F4F2" : "#EAF3FF",
                }}>
                  {activity.type === "session" ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#158A98" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2F80FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0">
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: "#0B2B6B" }}>
                    {activity.type === "report"
                      ? `${activity.reportType ? activity.reportType.charAt(0).toUpperCase() + activity.reportType.slice(1) + " report" : "Report"} for ${activity.clientName}`
                      : `Session with ${activity.clientName}`}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#8298BC", marginTop: 1 }}>
                    {activity.type === "report"
                      ? "Generated report"
                      : activity.duration
                        ? `Duration: ${activity.duration} minutes`
                        : "Session"}
                  </div>
                </div>
              </div>
              <div className="flex items-center flex-shrink-0" style={{ gap: 16 }}>
                {activity.status && (
                  <span className={`text-[11.5px] font-bold px-[10px] py-[4px] rounded-full ${getStatusPill(activity.status)}`}>
                    {activity.status}
                  </span>
                )}
                <span style={{ fontSize: 12.5, color: "#A6B8D4", width: 120, textAlign: "right" }}>
                  {formatDate(activity.date)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
