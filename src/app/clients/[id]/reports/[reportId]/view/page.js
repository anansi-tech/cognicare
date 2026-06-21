"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { ageFromDob, genderLabel } from "@/lib/age";

// Compiled report viewer (Round 14). Renders the synthesized narrative,
// lets the clinician edit it while draft, marks it completed, and exports
// the PDF deliverable. The raw source AIReports are listed at the bottom
// for traceability.

const titleCase = (s) =>
  typeof s === "string" && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export default function ReportViewPage() {
  const params = useParams();
  const [report, setReport] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [narrative, setNarrative] = useState("");
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const r = await fetch(`/api/clients/${params.id}/reports/${params.reportId}`);
        if (!r.ok) throw new Error("Failed to fetch report");
        const data = await r.json();
        setReport(data.report);
        setNarrative(extractNarrative(data.report));

        const c = await fetch(`/api/clients/${params.id}`);
        if (!c.ok) throw new Error("Failed to fetch client information");
        const cdata = await c.json();
        setClient(cdata.client);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id, params.reportId]);

  const sources = useMemo(() => {
    if (!report?.content || typeof report.content !== "object") return [];
    if (Array.isArray(report.content.sources)) return report.content.sources;
    // Legacy shape: report.content was itself the array of envelopes.
    if (Array.isArray(report.content)) return report.content;
    return [];
  }, [report]);

  const isDraft = report?.status !== "completed";

  const save = async (nextStatus) => {
    const setBusy = nextStatus === "completed" ? setFinalizing : setSaving;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/clients/${params.id}/reports/${params.reportId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            narrative,
            ...(nextStatus ? { status: nextStatus } : {}),
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      const data = await res.json();
      setReport(data.report);
      setNarrative(extractNarrative(data.report));
      toast.success(nextStatus === "completed" ? "Report finalized." : "Draft saved.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

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

  const pdfUrl = `/api/clients/${params.id}/reports/${params.reportId}/pdf`;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {titleCase(report.type)} Report
            </h1>
            <p className="text-gray-600 mt-1">
              Prepared by {report.createdBy?.name ?? "Unknown clinician"}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/clients/${params.id}`}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium"
            >
              ← Back to client
            </Link>
            <a
              href={`${pdfUrl}?download=1`}
              className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md text-sm font-medium"
            >
              Download PDF
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium"
            >
              Preview PDF
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 p-5 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Client</p>
            <p className="text-base font-semibold text-gray-900">
              {client?.name || "Unknown"}
            </p>
            <p className="text-sm text-gray-600">
              {ageFromDob(client?.dateOfBirth) ?? "—"} yrs · {genderLabel(client?.gender)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Period</p>
            <p className="text-base font-semibold text-gray-900">
              {format(new Date(report.startDate), "MMM d, yyyy")}
            </p>
            <p className="text-sm text-gray-600">
              to {format(new Date(report.endDate), "MMM d, yyyy")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Generated</p>
            <p className="text-base font-semibold text-gray-900">
              {format(new Date(report.createdAt), "MMM d, yyyy")}
            </p>
            <p className="text-sm text-gray-600">
              {format(new Date(report.createdAt), "p")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isDraft
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {isDraft ? "Draft" : "Completed"}
            </span>
            <p className="text-sm text-gray-600 mt-1">
              {sources.length} source record{sources.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {isDraft && (
          <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-900">
            This narrative is an AI-generated draft. Please review and edit
            before marking it completed. Drafts export with a watermark.
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Narrative</h2>
        </div>
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={18}
          readOnly={!isDraft}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary read-only:bg-gray-50 read-only:cursor-default"
          placeholder="Narrative will appear here…"
        />

        <div className="mt-4 flex justify-end gap-2">
          {isDraft && (
            <>
              <button
                type="button"
                onClick={() => save()}
                disabled={saving || finalizing}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={() => save("completed")}
                disabled={saving || finalizing || !narrative.trim()}
                className="px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-md text-sm font-medium disabled:opacity-60"
              >
                {finalizing ? "Finalizing…" : "Mark as completed"}
              </button>
            </>
          )}
          {!isDraft && (
            <button
              type="button"
              onClick={() => save("draft")}
              disabled={saving || finalizing}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium disabled:opacity-60"
            >
              Re-open as draft
            </button>
          )}
        </div>

        {sources.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Source records
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              The narrative was synthesized from {sources.length} agent record
              {sources.length === 1 ? "" : "s"} in the chart:
            </p>
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
              {sources.map((s, i) => (
                <li key={s.id ?? s._id ?? i} className="px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800">
                      {titleCase(s.agentType)}
                    </span>
                    {s.createdAt && (
                      <span className="text-gray-500">
                        {format(new Date(s.createdAt), "PPp")}
                      </span>
                    )}
                  </div>
                  {s.summary && (
                    <p className="mt-1 text-sm text-gray-600">{s.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function extractNarrative(report) {
  if (!report?.content) return "";
  if (typeof report.content === "string") return report.content;
  if (Array.isArray(report.content)) return ""; // legacy: prior reports stored an array of envelopes
  if (typeof report.content === "object" && report.content !== null) {
    return report.content.narrative || "";
  }
  return "";
}
