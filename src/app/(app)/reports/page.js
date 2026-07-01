"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";

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

    if (searchTerm) {
      filtered = filtered.filter((report) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          report.type.toLowerCase().includes(searchLower) ||
          (report.clientId?.name?.toLowerCase().includes(searchLower) ?? false)
        );
      });
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((report) => report.type === typeFilter);
    }

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

      setReports(reports.filter((report) => report._id !== reportId));
      setFilteredReports(filteredReports.filter((report) => report._id !== reportId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size={40} />
          <p className="mt-4 text-sm text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>Reports</p>
        <div className="mt-4 text-sm text-destructive">{error}</div>
      </div>
    );
  }

  const INPUT_STYLE = {
    border: "1px solid #DCE6F3",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#0B2B6B",
    background: "#fff",
    outline: "none",
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
          Reports
        </p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          Clinical reports
        </h1>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
        <input
          type="text"
          placeholder="Search reports..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...INPUT_STYLE, flex: "1 1 200px" }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ ...INPUT_STYLE, flex: "0 0 auto" }}
        >
          <option value="all">All types</option>
          <option value="assessment">Assessment</option>
          <option value="diagnostic">Diagnostic</option>
          <option value="treatment">Treatment</option>
          <option value="progress">Progress</option>
          <option value="documentation">Documentation</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ ...INPUT_STYLE, flex: "0 0 auto" }}
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">Last week</option>
          <option value="month">Last month</option>
        </select>
      </div>

      {filteredReports.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#55698F" }}>No reports found.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, overflow: "hidden", boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)" }}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filteredReports.map((report, idx) => (
              <li
                key={report._id}
                style={{
                  borderBottom: idx < filteredReports.length - 1 ? "1px solid #E3ECF7" : "none",
                }}
              >
                <Link
                  href={`/clients/${report.clientId._id || report.clientId}/reports/${report._id}/view`}
                  className="block hover:bg-[#F5F9FE] transition-colors"
                  style={{ padding: "14px 20px", textDecoration: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#2F80FF" }}>
                          {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                        </span>
                        <span style={{ fontSize: 12.5, color: "#8298BC" }}>
                          {format(new Date(report.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
                        <span style={{ fontSize: 13, color: "#55698F" }}>
                          {report.clientId?.name || "Unknown Client"}
                        </span>
                        <span style={{ fontSize: 13, color: "#8298BC" }}>
                          {format(new Date(report.startDate), "MMM d, yyyy")} – {format(new Date(report.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteReport(report._id);
                      }}
                      className="text-destructive hover:text-destructive/80 transition-colors flex-shrink-0"
                      title="Delete Report"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
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
