import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";
import MeasureAdministration from "@/models/measureAdministration";
import SafetyPlan from "@/models/safetyPlan";
import { getTrend } from "@/lib/mbc/trend";
import { listInstruments } from "@/lib/mbc/instruments";
import { categorize } from "@/lib/mbc/score";

const j = (label, obj) => `## ${label}\n${JSON.stringify(obj, null, 2)}`;

/** Semi-static per-client block: identity, history, recent reports, measure trends.
 * `excludeReportIds`: reports invisible to the agent — regeneration saves new
 * artifacts before deleting the superseded ones (crash-safe ordering), and the
 * agent must not see the stale reports it is replacing. */
export async function buildClientBlock(clientId, { excludeReportIds = [] } = {}) {
  await connectDB();
  const client = await Client.findById(clientId);
  if (!client) throw new Error("Client not found");

  const recentSessions = await Session.find({ clientId }).sort({ date: -1 }).limit(8);
  const recentReports = await AIReport.find({
    clientId,
    ...(excludeReportIds.length ? { _id: { $nin: excludeReportIds } } : {}),
  }).sort({ createdAt: -1 }).limit(8);

  // Pull trends for every registered instrument; skip ones with no data so
  // the prompt isn't padded with "insufficient-data" for unused instruments.
  const trends = {};
  for (const { id } of listInstruments()) {
    const t = await getTrend(clientId, id, 6);
    if (t.points?.length) trends[id] = t;
  }

  // Latest categorical screener result (C-SSRS): tier + positives + date.
  // Hydrated read — responses are encrypted at rest. Context-plumbing only;
  // the agents' existing Risk guidance consumes it.
  const screening = {};
  for (const { id, shortName, categorical } of listInstruments()) {
    if (!categorical) continue;
    const latest = await MeasureAdministration.findOne({ clientId, instrumentId: id })
      .sort({ administeredAt: -1 });
    if (!latest) continue;
    const { tier, positives } = categorize(id, latest.responses ?? []);
    screening[id] = { shortName, tier, positives, date: latest.administeredAt };
  }

  // Safety-plan metadata only (existence + review recency) — never contents.
  const plan = await SafetyPlan.findOne({ clientId }).select("reviewedAt updatedAt").lean();

  const blocks = [
    j("Client", client),
    j("Recent Sessions (newest first)", recentSessions),
    j("Recent AI Reports (newest first)", recentReports),
    j("Measure Trends (oldest -> newest)", trends),
  ];
  if (Object.keys(screening).length) {
    blocks.push(j("Suicide Risk Screening (latest result per screener)", screening));
    blocks.push(j("Safety Plan (metadata only)", plan
      ? { onFile: true, reviewedAt: plan.reviewedAt ?? null, updatedAt: plan.updatedAt }
      : { onFile: false }));
  }
  return blocks.join("\n\n");
}

export function buildRequestBlock(label, data) {
  return `## ${label}\n${JSON.stringify(data, null, 2)}`;
}
