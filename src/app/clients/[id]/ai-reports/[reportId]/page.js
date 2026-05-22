"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { AgentReportBody } from "@/components/ai/AgentReportBody";

const titleCase = (s) =>
  typeof s === "string" && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export default function AIReportPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/clients/${params.id}/ai-reports/${params.reportId}`);
        if (!res.ok) {
          throw new Error((await res.json()).error ?? "Failed to fetch report");
        }
        const data = await res.json();
        setReport(data.report);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [params.id, params.reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Report not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {titleCase(report.agentType)} Report
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {format(new Date(report.createdAt), "PPP 'at' p")}
              {report.counselorId?.name && <> · by {report.counselorId.name}</>}
            </p>
          </div>
        </div>

        {report.summary && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h2 className="text-sm font-medium text-gray-700 mb-1">Summary</h2>
            <p className="text-gray-700">{report.summary}</p>
          </div>
        )}

        <AgentReportBody agentType={report.agentType} payload={report.payload} />
      </div>
    </div>
  );
}
