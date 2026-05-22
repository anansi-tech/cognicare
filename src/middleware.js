import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request) {
  const token = await getToken({ req: request });

  // Skip audit logging for non-authenticated routes
  if (!token) {
    return NextResponse.next();
  }

  // Refresh session on activity
  const response = NextResponse.next();
  response.cookies.set("lastActivity", Date.now().toString());

  const startTime = Date.now();
  const { method, url, headers } = request;

  try {
    // Get the response
    const response = await NextResponse.next();

    // Determine the action based on HTTP method
    let action;
    switch (method) {
      case "GET":
        action = "read";
        break;
      case "POST":
        action = "create";
        break;
      case "PUT":
      case "PATCH":
        action = "update";
        break;
      case "DELETE":
        action = "delete";
        break;
      default:
        action = method.toLowerCase();
    }

    // Determine entity type from URL
    let entityType = "settings";
    const path = url.split("/");
    if (path.includes("clients")) {
      entityType = "client";
    } else if (path.includes("sessions")) {
      entityType = "session";
    } else if (path.includes("invoices")) {
      entityType = "invoice";
    } else if (path.includes("documents")) {
      entityType = "document";
    } else if (path.includes("users")) {
      entityType = "user";
    } else if (path.includes("auth")) {
      entityType = "user";
      action = path.includes("login") ? "login" : "logout";
    }

    // Get entity ID from URL if available
    let entityId = null;
    const idMatch = url.match(/\/([a-f\d]{24})(?:\/|$)/i);
    if (idMatch) {
      entityId = idMatch[1];
    }

    // For auth routes, use the user's ID as the entityId
    if (path.includes("auth") && !entityId) {
      entityId = token.id;
    }

    // Only log if we have an entityId or it's an auth action
    if (entityId || (path.includes("auth") && (action === "login" || action === "logout"))) {
      await fetch(`${request.nextUrl.origin}/api/audit/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: token.id,
          action,
          entityType,
          entityId: entityId || token.id, // Use token.id as fallback for auth actions
          details: {
            method,
            url,
            statusCode: response.status,
            duration: Date.now() - startTime,
          },
          ipAddress: headers.get("x-forwarded-for") || headers.get("x-real-ip") || "unknown",
          userAgent: headers.get("user-agent"),
        }),
      });
    }

    return response;
  } catch (error) {
    console.error("Error in audit middleware:", error);
    return NextResponse.next();
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    "/api/:path*",
    "/clients/:path*",
    "/sessions/:path*",
    "/invoices/:path*",
    "/documents/:path*",
    "/admin/:path*",
  ],
};
