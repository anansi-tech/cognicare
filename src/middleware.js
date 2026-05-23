// Auth.js v5 — auth-only middleware. UX redirects for unauthed nav; the real
// security gate is auth() in each route + server component. Audit logging
// moved out of middleware (was an HTTP fetch per request, including reads
// and static polls — noise + wasteful). Meaningful events (login/logout,
// client view/edit/delete, export) are written directly via logAuditEvent()
// from the route handlers that own those actions.
import { auth } from "@/auth";

export default auth(() => {
  // No-op for now. Auth.js's signIn page redirect handles unauthed page
  // navigations; API routes return 401 via requireAuth/auth() in-handler.
});

export const config = {
  matcher: ["/clients/:path*", "/sessions/:path*", "/admin/:path*"],
};
