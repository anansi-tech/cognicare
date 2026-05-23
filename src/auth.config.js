// Edge-safe auth config — imported by middleware (which runs on the Edge
// runtime). NOTHING in this file may pull in Mongoose, the DB, or anything
// that uses dynamic eval (a Mongoose import alone breaks the Edge build).
//
// Providers + DB-backed callbacks + events live in src/auth.js, which is
// loaded only from Node contexts (the /api/auth catch-all route and lib/auth
// helpers used by server components).
//
// Middleware constructs its own NextAuth({ ...authConfig }) so it can decode
// the JWT cookie (same secret) without touching Mongo.

const authConfig = {
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 60 },        // 30-min active session
  jwt: { maxAge: 30 * 24 * 60 * 60 },                    // 30-day refresh
  providers: [],                                          // populated in src/auth.js
};

export default authConfig;
