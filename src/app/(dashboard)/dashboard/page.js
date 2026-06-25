"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleActivityClick = (activity) => {
    if (activity.type === "session") {
      router.push(`/sessions/${activity.id}`);
    } else if (activity.type === "report") {
      // The real report viewer is client-scoped (Round 14). Skip silently if
      // for some reason clientId is missing rather than 404 to /reports/:id.
      if (activity.clientId) {
        router.push(`/clients/${activity.clientId}/reports/${activity.id}/view`);
      }
    }
  };

  const tz = session?.user?.timezone ?? "America/New_York";

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-accent text-accent-foreground";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "session":
        return "💬";
      case "report":
        return "📝";
      default:
        return "📌";
    }
  };

  return (
    <div className="space-y-6">
      {/* Today's Schedule — the highest-value pixel on the dashboard */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-4 sm:px-6 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date().toLocaleDateString("en-US", {
                timeZone: tz,
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {stats.upcomingThisWeek > 0 && (
            <Link
              href="/sessions/calendar"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              {stats.upcomingThisWeek} more in the next 7 days →
            </Link>
          )}
        </div>
        {stats.todaysAppointments.length === 0 ? (
          <div className="px-4 py-8 sm:px-6 text-center text-sm text-gray-500">
            No appointments today.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {stats.todaysAppointments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/sessions/${a.id}`}
                  className="block px-4 py-3 sm:px-6 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-sm font-semibold text-gray-900 tabular-nums w-20 flex-shrink-0">
                        {formatTime(a.date)}
                      </span>
                      <span className="text-sm text-gray-800 truncate">
                        {a.clientName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatLabel[a.format] || a.format}
                      {a.type ? ` · ${a.type}` : ""}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Clients Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">👥</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stats.totalClients}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/clients" className="font-medium text-primary hover:text-primary/80">
                View all clients
              </Link>
            </div>
          </div>
        </div>

        {/* Active Sessions Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">💬</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Sessions</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-primary">
                      {stats.activeSessions}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/sessions" className="font-medium text-primary hover:text-primary/80">
                View all sessions
              </Link>
            </div>
          </div>
        </div>

        {/* Completed Sessions Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed Sessions</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-green-600">
                      {stats.completedSessions}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/sessions?status=completed"
                className="font-medium text-primary hover:text-primary/80"
              >
                View completed sessions
              </Link>
            </div>
          </div>
        </div>

        {/* Reports Generated Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📊</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Reports Generated</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-purple-600">
                      {stats.reportsGenerated}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/reports" className="font-medium text-primary hover:text-primary/80">
                View all reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {stats.recentActivity.map((activity, index) => (
              <li
                key={index}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                onClick={() => handleActivityClick(activity)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{getActivityIcon(activity.type)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.type === "report"
                          ? `${activity.reportType ? activity.reportType.charAt(0).toUpperCase() + activity.reportType.slice(1) + " report" : "Report"} for ${activity.clientName}`
                          : `Session with ${activity.clientName}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.type === "report"
                          ? "Generated report"
                          : activity.duration
                            ? `Duration: ${activity.duration} minutes`
                            : "Session"}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    {activity.status && (
                      <p
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          activity.status
                        )}`}
                      >
                        {activity.status}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <span className="mr-2">📅</span>
                  <p>{formatDate(activity.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
