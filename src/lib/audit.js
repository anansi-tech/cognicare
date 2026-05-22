import { connectDB } from "./mongodb";
import AuditLog from "@/models/auditLog";

export async function logAuditEvent({
  userId,
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
    console.error("Error logging audit event:", error);
    throw error;
  }
}

export async function getAuditLogs({
  userId,
  entityType,
  entityId,
  startDate,
  endDate,
  action,
  page = 1,
  limit = 50,
}) {
  try {
    await connectDB();

    const query = {};
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

    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean();

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
  SETTINGS: "settings",
};
