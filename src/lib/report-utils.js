import AIReport from "@/models/aiReport";
import Session from "@/models/session";
import Client from "@/models/client";
import { connectDB } from "@/lib/mongodb";
import { MODELS } from "@/lib/ai/client";

/**
 * Persist a validated envelope ({ agentType, summary, payload }) as an AIReport doc.
 * Caller supplies clientId, sessionId (optional), userId, practiceId.
 */
export async function persistReport({
  agentType,
  summary,
  payload,
  clientId,
  sessionId,
  userId,
  practiceId,
  version,
  supersedes,
  status,
}) {
  await connectDB();
  // Derive practiceId from the Client if the caller didn't pass one (defensive).
  let derivedPracticeId = practiceId;
  if (!derivedPracticeId) {
    const client = await Client.findById(clientId).select("practiceId").lean();
    derivedPracticeId = client?.practiceId;
  }
  const doc = new AIReport({
    clientId,
    practiceId: derivedPracticeId,
    counselorId: userId,
    sessionId,
    agentType,
    summary,
    payload,
    source: "agent-v2",
    modelVersion: MODELS.clinical,
    // Caller may pass explicit status; fallback: documentation drafts automatically.
    status: status ?? (agentType === "documentation" ? "draft" : undefined),
    ...(version !== undefined && { version }),
    ...(supersedes !== undefined && { supersedes }),
  });
  await doc.save();
  return doc;
}

/**
 * Get all relevant AI reports for a client within a date range
 */
export async function getClientReports(clientId, startDate, endDate, agentTypes = []) {
  const dateRange = {};
  if (startDate) dateRange.$gte = startDate;
  if (endDate) dateRange.$lte = endDate;
  const query = {
    clientId,
    ...(Object.keys(dateRange).length > 0 && { createdAt: dateRange }),
    ...(agentTypes.length > 0 && { agentType: { $in: agentTypes } }),
  };

  return await AIReport.find(query).sort({ createdAt: -1 }).lean();
}

/**
 * Get session data for a client within a date range
 */
export async function getClientSessions(clientId, startDate, endDate) {
  const query = {
    clientId,
    ...(startDate && { date: { $gte: startDate } }),
    ...(endDate && { date: { $lte: endDate } }),
    status: "completed",
  };

  return await Session.find(query).sort({ date: -1 }).lean();
}

/**
 * Get client information
 */
export async function getClientInfo(clientId) {
  return await Client.findById(clientId).lean();
}

/**
 * Generate report metadata
 */
export function generateReportMetadata(reportType, user) {
  return {
    generatedBy: user.id,
    generatedAt: new Date(),
    reportType,
    version: "1.0",
  };
}
