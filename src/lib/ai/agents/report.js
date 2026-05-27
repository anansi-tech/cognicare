import { generateText } from "ai";
import { openai, MODELS } from "@/lib/ai/client";
import { loadPrompt } from "@/lib/ai/prompts";
import { ageFromDob } from "@/lib/age";

// Synthesize the gathered AIReports for a client + date range into a clinical
// narrative (free-form prose, not JSON). Used by report generation to produce
// the body of an exportable Report. The model output is treated as a draft —
// the clinician reviews + edits before the report is marked completed.
export async function synthesizeReport({ reportType, client, agentReports, from, to }) {
  const system = await loadPrompt("report");

  const records = agentReports.map((r) => ({
    agentType: r.agentType,
    date: r.createdAt,
    summary: r.summary,
    payload: r.payload,
  }));

  const context = [
    `Report type: ${reportType}.`,
    `Period: ${formatDate(from)} to ${formatDate(to)}.`,
    `Client: ${client.name || "Unknown"}, age ${ageFromDob(client.dateOfBirth) ?? "n/a"}.`,
    "",
    "Source records (most-recent first):",
    JSON.stringify(records, null, 2),
  ].join("\n");

  const { text } = await generateText({
    model: openai(MODELS.clinical),
    system,
    messages: [{ role: "user", content: context }],
  });

  return (text || "").trim();
}

function formatDate(d) {
  if (!d) return "n/a";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d);
  }
}
