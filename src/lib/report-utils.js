import AIReport from "@/models/aiReport";
import Session from "@/models/session";
import Client from "@/models/client";

/**
 * Get all relevant AI reports for a client within a date range
 */
export async function getClientReports(clientId, startDate, endDate, types = []) {
  const query = {
    clientId,
    ...(startDate && { "metadata.timestamp": { $gte: startDate } }),
    ...(endDate && { "metadata.timestamp": { $lte: endDate } }),
    ...(types.length > 0 && { type: { $in: types } }),
  };

  return await AIReport.find(query).sort({ "metadata.timestamp": -1 }).lean();
}

/**
 * Get session data for a client within a date range
 */
export async function getClientSessions(clientId, startDate, endDate) {
  const query = {
    clientId,
    ...(startDate && { date: { $gte: startDate } }),
    ...(endDate && { date: { $lte: endDate } }),
    documented: true,
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
