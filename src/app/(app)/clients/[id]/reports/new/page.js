"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";

// Single entry point for compiling a report (Round 14). Submitting kicks
// off the synthesis agent, which can take several seconds; on success we
// land on the report viewer where the clinician reviews/edits the draft
// narrative before exporting the PDF.

const REPORT_TYPES = [
  { value: "progress", label: "Progress Report" },
  { value: "treatment", label: "Treatment Report" },
  { value: "assessment", label: "Assessment Report" },
  { value: "diagnostic", label: "Diagnostic Report" },
  { value: "documentation", label: "Documentation Report" },
];

export default function NewReportPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const [formData, setFormData] = useState({
    type: "progress",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${id}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate report");
      }

      router.push(`/clients/${id}/reports/${data.report._id}/view`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">New report</h1>
      <p className="text-sm text-gray-600 mb-6">
        Synthesize a narrative report from this client&apos;s AI-generated records
        in the selected period. You&apos;ll review and edit the draft before
        exporting.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
            Report Type
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-ring focus:border-primary sm:text-sm rounded-md"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-ring focus:border-primary sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:ring-ring focus:border-primary sm:text-sm"
            />
          </div>
        </div>

        {isGenerating && (
          <div className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
            Synthesizing the narrative from agent records in this period — this
            usually takes 10–30 seconds.
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isGenerating}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isGenerating}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating…" : "Generate report"}
          </button>
        </div>
      </form>
    </div>
  );
}
