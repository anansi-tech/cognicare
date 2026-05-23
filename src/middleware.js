// Auth.js v5 middleware. Runs on the Edge runtime — must NOT import anything
// that pulls in Mongoose or other Node-only deps. So instead of importing the
// full src/auth.js (which loads Practice/User models), we build a tiny
// NextAuth() instance here from the shared edge-safe slice in auth.config.js.
// It can decode the same JWT cookie because it uses the same secret.
//
// The real security gate is auth() in each route + server component; this
// middleware is UX only. Audit logging happens in the route handlers that
// own PHI-touching actions, not here.
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth(() => {
  // Unauthed page navigations are redirected by Auth.js's signIn page; API
  // routes return 401 in-handler via requireAuth/auth(). No work to do here.
});

export const config = {
  matcher: ["/clients/:path*", "/sessions/:path*", "/admin/:path*"],
};
