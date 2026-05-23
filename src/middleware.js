// Auth.js v5 middleware. The auth() wrapper exposes req.auth (the session) on
// the request, replacing the v4 getToken({ req }) pattern. Behavior preserved:
// the same matcher routes are audit-logged, with token.id -> req.auth.user.id.
//
// Reminder (Auth.js guidance): middleware is NOT the security boundary — the
// real gate is auth() in each route/server component, which we already have.
// This is UX + audit logging.
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth(async function middleware(request) {
  const session = request.auth;

  // Not authenticated → let the request through; the route's own auth() call
  // is the gate. No audit needed for unauth'd requests.
  if (!session?.user?.id) {
    return NextResponse.next();
  }
  const userId = session.user.id;

  // Refresh session on activity
  const response = NextResponse.next();
  response.cookies.set("lastActivity", Date.now().toString());

  const startTime = Date.now();
  const { method, url, headers } = request;

  try {
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
      entityId = userId;
    }

    // Only log if we have an entityId or it's an auth action
    if (entityId || (path.includes("auth") && (action === "login" || action === "logout"))) {
      await fetch(`${request.nextUrl.origin}/api/audit/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          action,
          entityType,
          entityId: entityId || userId, // Use userId as fallback for auth actions
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
});

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
