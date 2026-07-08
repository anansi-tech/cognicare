import { connectDB } from "./mongodb";
import AuditLog from "@/models/auditLog";

export async function logAuditEvent({
  userId,
  practiceId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
  userAgent,
}) {
  try {
    await connectDB();

    const auditLog = new AuditLog({
      timestamp: new Date(),
      userId,
      practiceId,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
      userAgent,
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    // Audit failures must never break the user-facing request. Log and move on.
    console.error("Error logging audit event:", error);
    return null;
  }
}

// Convenience: derive ip + UA from a Next.js Request for inline route calls.
export function auditMetaFromRequest(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== "function") {
    return { ipAddress: "unknown", userAgent: "unknown" };
  }
  return {
    ipAddress:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "unknown",
    userAgent: headers.get("user-agent") || "unknown",
  };
}

export async function getAuditLogs({
  practiceId,
  userId,
  entityType,
  entityId,
  startDate,
  endDate,
  action,
  page = 1,
  limit = 50,
}) {
  // Belt-and-braces tenant isolation: refuse to query without a practiceId
  // even if an API gate above us forgets to pass one. Audit logs are the one
  // place a cross-tenant leak is unacceptable.
  if (!practiceId) throw new Error("getAuditLogs requires practiceId");

  try {
    await connectDB();

    const query = { practiceId };
    if (userId) query.userId = userId;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email")
      .lean();

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
}

// Common audit actions
export const AuditActions = {
  LOGIN: "login",
  LOGOUT: "logout",
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  REGENERATE: "regenerate",
  EXPORT: "export",
  IMPORT: "import",
  ACCESS_DENIED: "access_denied",
};

// Common entity types
export const EntityTypes = {
  USER: "user",
  CLIENT: "client",
  SESSION: "session",
  INVOICE: "invoice",
  DOCUMENT: "document",
  REPORT: "report",
  SETTINGS: "settings",
  MEASURE: "measure",
};
