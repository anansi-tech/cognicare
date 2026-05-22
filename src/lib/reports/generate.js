import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

// Gather the AI agent outputs of one type for a client within a date range.
// Used by POST /api/clients/[id]/reports to compile a saved Report.
export async function gatherAgentReports(agentType, clientId, from, to) {
  await connectDB();
  const start = new Date(from); start.setUTCHours(0, 0, 0, 0);
  const end = new Date(to); end.setUTCHours(23, 59, 59, 999);
  return AIReport.find({
    clientId,
    agentType,
    createdAt: { $gte: start, $lte: end },
  }).sort({ createdAt: -1 }).lean();
}
