import { NextResponse } from "next/server";
import { logAuditEvent, AuditActions, EntityTypes } from "@/lib/audit";

export async function auditMiddleware(req, res) {
  const startTime = Date.now();
  const { method, url, headers } = req;
  const user = req.user;

  // Skip audit logging for non-authenticated routes
  if (!user) {
    return NextResponse.next();
  }

  try {
    // Get the response
    const response = await NextResponse.next();

    // Determine the action based on HTTP method
    let action;
    switch (method) {
      case "GET":
        action = AuditActions.READ;
        break;
      case "POST":
        action = AuditActions.CREATE;
        break;
      case "PUT":
      case "PATCH":
        action = AuditActions.UPDATE;
        break;
      case "DELETE":
        action = AuditActions.DELETE;
        break;
      default:
        action = method.toLowerCase();
    }

    // Determine entity type from URL
    let entityType = EntityTypes.SETTINGS;
    const path = url.split("/");
    if (path.includes("clients")) {
      entityType = EntityTypes.CLIENT;
    } else if (path.includes("sessions")) {
      entityType = EntityTypes.SESSION;
    } else if (path.includes("invoices")) {
      entityType = EntityTypes.INVOICE;
    } else if (path.includes("documents")) {
      entityType = EntityTypes.DOCUMENT;
    } else if (path.includes("users")) {
      entityType = EntityTypes.USER;
    }

    // Get entity ID from URL if available
    let entityId = null;
    const idMatch = url.match(/\/([a-f\d]{24})(?:\/|$)/i);
    if (idMatch) {
      entityId = idMatch[1];
    }

    // Log the audit event
    await logAuditEvent({
      userId: user._id,
      action,
      entityType,
      entityId,
      details: {
        method,
        url,
        statusCode: response.status,
        duration: Date.now() - startTime,
        requestBody: method !== "GET" ? req.body : undefined,
      },
      ipAddress: headers.get("x-forwarded-for") || req.ip,
      userAgent: headers.get("user-agent"),
    });

    return response;
  } catch (error) {
    console.error("Error in audit middleware:", error);
    return NextResponse.next();
  }
}

// Export the middleware
export default auditMiddleware;
