import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";
import { getTrend } from "@/lib/mbc/trend";
import { listInstruments } from "@/lib/mbc/instruments";

const j = (label, obj) => `## ${label}\n${JSON.stringify(obj, null, 2)}`;

/** Semi-static per-client block: identity, history, recent reports, measure trends. */
export async function buildClientBlock(clientId) {
  await connectDB();
  const client = await Client.findById(clientId).lean();
  if (!client) throw new Error("Client not found");

  const recentSessions = await Session.find({ clientId }).sort({ date: -1 }).limit(8).lean();
  const recentReports = await AIReport.find({ clientId }).sort({ createdAt: -1 }).limit(8).lean();

  // Pull trends for every registered instrument; skip ones with no data so
  // the prompt isn't padded with "insufficient-data" for unused instruments.
  const trends = {};
  for (const { id } of listInstruments()) {
    const t = await getTrend(clientId, id, 6);
    if (t.points?.length) trends[id] = t;
  }

  return [
    j("Client", client),
    j("Recent Sessions (newest first)", recentSessions),
    j("Recent AI Reports (newest first)", recentReports),
    j("Measure Trends (oldest -> newest)", trends),
  ].join("\n\n");
}

export function buildRequestBlock(label, data) {
  return `## ${label}\n${JSON.stringify(data, null, 2)}`;
}
