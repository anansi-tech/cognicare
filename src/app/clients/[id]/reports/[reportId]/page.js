"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";

export default function ReportPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/clients/${params.id}/reports/${params.reportId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch report");
        }
        const data = await response.json();
        // Ensure content is an array
        if (data.report && !Array.isArray(data.report.content)) {
          data.report.content = [
            {
              title: "Report Content",
              content:
                typeof data.report.content === "string"
                  ? data.report.content
                  : JSON.stringify(data.report.content, null, 2),
            },
          ];
        }
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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Report Details</h1>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Print Report
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Report Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Report Type</p>
            <p className="font-medium">{report.type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-medium">{report.createdBy?.name || "Unknown"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Created At</p>
            <p className="font-medium">{format(new Date(report.createdAt), "PPP")}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time Period</p>
            <p className="font-medium">
              {format(new Date(report.startDate), "PPP")} -{" "}
              {format(new Date(report.endDate), "PPP")}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Report Content</h2>
        <div className="prose max-w-none">
          {Array.isArray(report.content) ? (
            report.content.map((section, index) => (
              <div key={index} className="mb-6">
                <h3 className="text-xl font-semibold mb-4">{section.title}</h3>
                <div className="whitespace-pre-wrap">{section.content}</div>
              </div>
            ))
          ) : (
            <div className="text-red-500">Invalid report content format</div>
          )}
        </div>
      </div>
    </div>
  );
}
