# Round 9 — Auth.js v5 migration (pure swap, no behavior change)

> Branch `dev`, working dir `products/cognicare`. Migrate NextAuth v4 → Auth.js v5. **This is a
> behavior-preserving swap: the app must work *exactly* as before — same login, same session shape,
> same guards.** No new features. (Team management = Round 10; MFA decision noted at the end.)
> Success looks like "nothing changed except the underlying library," which is the goal, not a
> disappointment. Resist adding anything mid-migration.

## Why a pure swap

NextAuth v4 → Auth.js v5 is a breaking rewrite of the auth layer (config location, `auth()` vs
`getServerSession`, middleware shape). 60 files consume the current helpers. We change the *plumbing*
and keep every behavior identical, so when Round 10 builds invites/roles on top, it's on stable
ground. If something breaks after this round, it's the migration — not tangled with a new feature.

## What must NOT change (behavior contract)

- Credentials login (email + bcrypt password) works the same.
- Session carries the same fields: `id`, `role`, `practiceId`, `stripeSubscriptionStatus`.
- The Round 8 JWT refresh (re-reads practiceId + Practice Stripe status every issuance) is preserved.
- `getCurrentUser()` returns the same `user` object shape — so the ~60 consumers don't change their
  *usage*, only what they import.
- Session timing: 30-min active session, 30-day refresh.
- `/login` is the sign-in + error page.

## Step 1 — Install

```bash
npm install next-auth@beta   # Auth.js v5 (ships as next-auth@5 / @beta)
```
`bcryptjs` stays. `@auth/core` is pulled transitively — don't install it directly.

## Step 2 — Root config `src/auth.js` (replaces the exported authOptions)

Create `src/auth.js` exporting the v5 surface. Port the v4 `authOptions` faithfully:
```js
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Practice from "@/models/practice";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 60 },        // 30-min active session (unchanged)
  jwt: { maxAge: 30 * 24 * 60 * 60 },                   // 30-day refresh (unchanged)
  pages: { signIn: "/login", error: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        await connectDB();
        const user = await User.findOne({ email: credentials?.email });
        if (!user) return null;                          // v5: return null (don't throw) for bad creds
        const ok = await compare(credentials.password, user.password);
        if (!ok) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          practiceId: user.practiceId ? user.practiceId.toString() : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; token.practiceId = user.practiceId ?? null; }
      // Round 8 behavior: refresh practiceId + Practice Stripe status every issuance.
      if (token.id) {
        await connectDB();
        const fresh = await User.findById(token.id).select("practiceId role").lean();
        token.role = fresh?.role ?? token.role;
        token.practiceId = fresh?.practiceId ? fresh.practiceId.toString() : null;
        token.stripeSubscriptionStatus = token.practiceId
          ? (await Practice.findById(token.practiceId).select("stripeSubscriptionStatus").lean())?.stripeSubscriptionStatus ?? null
          : null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.practiceId = token.practiceId ?? null;
      session.user.stripeSubscriptionStatus = token.stripeSubscriptionStatus ?? null;
      return session;
    },
  },
});
```
> **Env:** v5 prefers `AUTH_SECRET` (it aliases `NEXTAUTH_SECRET`). Keep your existing secret; set
> `AUTH_SECRET` to the same value (or rely on the alias). Set `AUTH_TRUST_HOST=true` for local/Vercel.

## Step 3 — Route handler shrinks to a re-export

`src/app/api/auth/[...nextauth]/route.js` becomes:
```js
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```
All the config moved to `src/auth.js`. Delete the old `authOptions` export from this file.

## Step 4 — Rewrite `src/lib/auth.js` helpers on `auth()`

Keep the **same function names and return shapes** so consumers don't change. Internally swap
`getServerSession(authOptions)` → `auth()`:
```js
import { auth } from "@/auth";

export async function getSession() { return await auth(); }
export async function getCurrentUser() { return (await auth())?.user; }
export async function isAuthenticated() { return !!(await auth()); }
export async function isCounselor() { return (await auth())?.user?.role === "counselor"; }
export async function isAdmin() { return (await auth())?.user?.role === "admin"; }

// requireAuth/requireCounselor/requireAdmin: keep signatures identical, just use auth() inside.
export function requireAuth(handler) {
  return async (req, context) => {
    const session = await auth();
    if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    return handler(req, context);
  };
}
// ...requireCounselor / requireAdmin likewise (pass session through as before).
```
Because shapes are unchanged, the ~60 consumers of `getCurrentUser`/`requireAuth`/etc. need **no
edits**. Verify a sample compiles; don't touch them otherwise.

## Step 5 — Middleware + audit rearchitecture (the streamline you asked for)

The current audit setup is genuinely tangled — **three implementations of one write**:
1. `src/lib/audit.js` — a clean `logAuditEvent()` (direct DB write) + `getAuditLogs()` reader. **Good.**
2. `src/middleware/audit.js` — an orphaned middleware variant, **never wired anywhere** (dead file).
3. `src/middleware.js` — the *active* path, which ignores the helper and does an HTTP `fetch` to
   `/api/audit/log` on **every request** (static assets, polls, reads included). It also calls
   `NextResponse.next()` twice (a bug), and `/api/audit/log` exists *only* to receive this fetch —
   an HTTP endpoint wrapping a function we already have as a direct call.

Logging every GET via middleware is both wrong (noise: "user read a list" isn't a meaningful audit
event) and wasteful. For a clinical record the events that matter are: **login/logout, and
view/edit/export/delete of a specific client/session** — and those happen in a handful of route
handlers where the clean helper belongs.

**Rearchitect to minimal + proficient:**

- **Middleware becomes auth-only.** Replace the whole audit body. New `src/middleware.js`:
  ```js
  import { auth } from "@/auth";
  export default auth((req) => {
    // UX redirect only — real gate is auth() in each route. No audit logging here.
    if (!req.auth && req.nextUrl.pathname.startsWith("/api")) {
      return; // routes do their own 401 via requireAuth/auth()
    }
  });
  export const config = { matcher: ["/clients/:path*", "/sessions/:path*", "/admin/:path*"] };
  ```
  (Keep it light. Middleware is UX, not the security boundary — every route already validates with
  `auth()`.)
- **Delete** `src/middleware/audit.js` (dead) and **delete** `src/app/api/audit/log/route.js` (only
  the middleware fetched it).
- **Keep** `src/models/auditLog.js`, `src/lib/audit.js` (`logAuditEvent`/`getAuditLogs`/constants),
  `src/app/api/audit/route.js` (admin reader), and `src/app/components/admin/AuditLogs.js` (viewer).
- **Log meaningful events directly** via `logAuditEvent()` in the routes that matter — call it inline
  (it's a direct DB write, no fetch):
  - login / logout — in the auth `signIn`/`signOut` events or the login route.
  - client view (`GET /api/clients/[id]`), client/session create/update/delete, and **export**
    (`/api/export`) — the PHI-touching actions.
  Pass `userId` (from `auth()`), `entityType`, `entityId`, and `ipAddress`/`userAgent` from the
  request headers. Skip list/index GETs — they're noise.
- Add `practiceId` to the audit entries where available (so a practice's admin sees their practice's
  trail) — small, and aligns with Round 8. Optional if it adds churn; note it.

> Net: delete ~120 lines of middleware audit machinery + a redundant endpoint; the audit trail gets
> *better* (meaningful events, real IDs) and the hot path stops making an HTTP call per request.
> This is the "delete/refactor what's not ideal" you asked for.

## Step 6 — Client side

- `src/app/providers.js`: `SessionProvider` now imports from `next-auth/react` (unchanged import path
  in v5 for the React provider) — verify it still wraps the app.
- `useSession`, `signIn`, `signOut` in client components (`Navbar.js`, etc.): import paths from
  `next-auth/react` are stable in v5. Verify login/logout still work; adjust only if a call signature
  errors.

## Step 7 — Env / config cleanup

- Ensure `AUTH_SECRET` set (= old `NEXTAUTH_SECRET`); `AUTH_TRUST_HOST=true`.
- `NEXTAUTH_URL` → v5 infers it / `AUTH_URL`; keep `NEXT_PUBLIC_APP_URL` as-is (separate use).

## Acceptance criteria (this is a swap — verify SAMENESS)

1. Log in with existing credentials → lands on dashboard exactly as before.
2. Session has `id`, `role`, `practiceId`, `stripeSubscriptionStatus` (check a route that reads them,
   e.g. dashboard stats + the billing gate). Practice-scoped data still shows correctly.
3. The JWT refresh still updates Stripe status without re-login (change a Practice's status in DB →
   next request reflects it).
4. Logout works; protected routes redirect to `/login` when unauthenticated.
5. `grep -rn "getServerSession\|authOptions" src` → nothing (all migrated).
6. The ~60 consumers compile unchanged (only `lib/auth.js` and the config moved).
7. **Audit:** middleware no longer fetches `/api/audit/log` (endpoint + `middleware/audit.js`
   deleted); logging in/out and viewing/exporting a client writes an AuditLog via `logAuditEvent()`;
   the admin AuditLogs viewer still shows entries. `grep -rn "api/audit/log" src` → nothing.
8. `npm run lint` clean; `npm run build` succeeds (catches v5 type/import breaks).

## Suggested commits

```
chore(cognicare): install Auth.js v5 (next-auth@beta)
feat(cognicare): root auth.js config (handlers/auth/signIn/signOut); route re-export
refactor(cognicare): lib/auth helpers on auth() — same shapes, v5 underneath
refactor(cognicare): auth-only middleware; log meaningful audit events from routes
chore(cognicare): delete dead middleware/audit.js + redundant /api/audit/log endpoint
```

## MFA — not happening

Per the owner: **simple login is the design.** No MFA, no passkeys. Don't add an auth-hardening
round. If real-PHI compliance later wants a second factor, it's a future decision — not now.

## Then Round 10 — team management

On the stable v5 base: invite clinicians to a Practice (email invite → they register into the
existing practice), owner vs member roles, the admin/team screen, and enforce active clinicians ≤
paid seats. Your wife's 3-therapist practice is the live test.
