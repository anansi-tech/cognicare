"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      const fetchReports = async () => {
        try {
          setIsLoading(true);
          const response = await fetch("/api/reports");
          if (!response.ok) {
            throw new Error("Failed to fetch reports");
          }
          const data = await response.json();
          const reportsArray = Array.isArray(data) ? data : [];
          setReports(reportsArray);
          setFilteredReports(reportsArray);
        } catch (err) {
          console.error("Error fetching reports:", err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };

      fetchReports();
    }
  }, [status, router]);

  useEffect(() => {
    let filtered = [...reports];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((report) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          report.type.toLowerCase().includes(searchLower) ||
          (report.clientId?.name?.toLowerCase().includes(searchLower) ?? false)
        );
      });
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((report) => report.type === typeFilter);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      filtered = filtered.filter((report) => {
        const reportDate = new Date(report.createdAt);
        switch (dateFilter) {
          case "today":
            return reportDate.toDateString() === now.toDateString();
          case "week":
            return reportDate >= new Date(now.setDate(now.getDate() - 7));
          case "month":
            return reportDate >= thirtyDaysAgo;
          default:
            return true;
        }
      });
    }

    setFilteredReports(filtered);
  }, [searchTerm, typeFilter, dateFilter, reports]);

  const handleDeleteReport = async (reportId) => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete report");
      }

      // Remove the deleted report from the state
      setReports(reports.filter((report) => report._id !== reportId));
      setFilteredReports(filteredReports.filter((report) => report._id !== reportId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Reports</h1>
        {/*         <div className="flex gap-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </button>
        </div> */}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="assessment">Assessment</option>
            <option value="diagnostic">Diagnostic</option>
            <option value="treatment">Treatment</option>
            <option value="progress">Progress</option>
            <option value="documentation">Documentation</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reports found.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <li key={report._id} className="hover:bg-gray-50">
                <Link
                  href={`/clients/${report.clientId._id || report.clientId}/reports/${
                    report._id
                  }/view`}
                  className="block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                        </p>
                        <p className="ml-2 flex-shrink-0 text-xs text-gray-500">
                          {format(new Date(report.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteReport(report._id);
                          }}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Report"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Client: {report.clientId?.name || "Unknown Client"}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                          Period: {format(new Date(report.startDate), "MMM d, yyyy")} -{" "}
                          {format(new Date(report.endDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
