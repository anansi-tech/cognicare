"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function ReportsPage() {
  const params = useParams();
  const { id } = params;
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        console.log("Fetching reports for client:", id);
        const response = await fetch(`/api/clients/${id}/reports`);
        console.log("API Response status:", response.status);
        const data = await response.json();
        console.log("API Response data:", data);

        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }

        if (!data.reports) {
          console.error("No reports array in response:", data);
          setReports([]);
        } else {
          setReports(data.reports);
        }
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Client Reports</h1>
        <Link
          href={`/clients/${id}/reports/new`}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Generate New Report
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reports found for this client.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report._id}>
                <Link
                  href={`/clients/${id}/reports/${report._id}`}
                  className="block hover:bg-gray-50"
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
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {report.status}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
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
