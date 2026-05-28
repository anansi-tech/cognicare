# Round 24 — Audit log viewer (practice-scoped, owner-only)

> Branch `dev`, working dir `products/cognicare`. Audit events are already being
> written everywhere (`logAuditEvent` calls in every API route + login/logout in
> `auth.js`). The reader (`getAuditLogs` in `lib/audit.js:53`) is dead code and
> nothing exposes the logs in-app. This round wires up an owner-only `/audit`
> page so the practice owner can actually read their own audit trail.

## Scoping rules (non-negotiable)

- **practiceId scope** — `getAuditLogs` currently has no `practiceId` filter; that
  is the load-bearing gap. Every query in this round MUST filter by
  `practiceId === currentUser.practiceId`. No cross-tenant leakage, ever.
- **Owner-only** — both server (API) and client (page + nav). Non-owners get a
  403 from the API and a "ask your owner" view on the page (same shape as the
  existing `/billing` non-owner state at `src/app/billing/page.js:84`).
- **Records with no `practiceId`** (early/legacy events) — exclude them. They're
  orphan data and a missing `practiceId` is exactly the kind of bug we don't
  want to read past.

## 1. Extend `getAuditLogs` to take `practiceId` + resolve user names

`src/lib/audit.js` — add `practiceId` to the query and join user names so the
table doesn't show bare ObjectIds.

```js
export async function getAuditLogs({
  practiceId,           // REQUIRED — guard at the top, throw if missing
  userId,
  entityType,
  entityId,
  startDate,
  endDate,
  action,
  page = 1,
  limit = 50,
}) {
  if (!practiceId) throw new Error("getAuditLogs requires practiceId");
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
    .populate("userId", "name email")   // resolve actor → name/email
    .lean();
  const total = await AuditLog.countDocuments(query);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}
```

> Throwing on missing `practiceId` is a belt-and-braces guard. The API route
> below also checks owner status, but if anything else ever calls this function,
> the function itself refuses to return cross-tenant data.

## 2. `GET /api/audit` — owner-only, practice-scoped

New file: `src/app/api/audit/route.js`.

```js
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isPracticeOwner } from "@/lib/practice";
import { getAuditLogs } from "@/lib/audit";

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isPracticeOwner(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.practiceId) return NextResponse.json({ logs: [], total: 0, page: 1, totalPages: 0 });

  const { searchParams } = new URL(request.url);
  const data = await getAuditLogs({
    practiceId: user.practiceId,
    userId: searchParams.get("userId") || undefined,
    action: searchParams.get("action") || undefined,
    entityType: searchParams.get("entityType") || undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    page: Number(searchParams.get("page") || 1),
    limit: Math.min(Number(searchParams.get("limit") || 50), 200),
  });
  return NextResponse.json(data);
}
```
- Cap `limit` at 200 server-side so a malicious query string can't pull the
  whole collection in one go.
- No POST/PATCH/DELETE — audit logs are append-only and only written by
  `logAuditEvent`. The API never lets the client mutate.

## 3. `/audit` page — owner-only listing

New file: `src/app/audit/page.js`. Mirror the gate/skeleton from
`src/app/billing/page.js:60-94` (owner check + non-owner read-only view).

Page layout:

```
┌─────────────────────────────────────────────────────────────────┐
│ Audit log                                                        │
│ Every read, write, login, and access denial in this practice.    │
├─────────────────────────────────────────────────────────────────┤
│ Filters: [Clinician ▾] [Action ▾] [Entity ▾] [From] [To] [Clear] │
├─────────────────────────────────────────────────────────────────┤
│ When           Who         Action  Entity          IP            │
│ 2026-05-27 14:02  Dr. Smith   update  Client #abc12   1.2.3.4    │
│ 2026-05-27 13:51  Dr. Smith   read    Session #def34  1.2.3.4    │
│ …                                                                │
│                                                            ‹ 1 › │
└─────────────────────────────────────────────────────────────────┘
```

Filter source data:
- **Clinician** dropdown — fetch from `/api/practice/clinicians` (already
  exists, returns practice members; auto-scoped). Owner picks one or "All".
- **Action** dropdown — hardcoded from `AuditActions` in `lib/audit.js`.
- **Entity** dropdown — hardcoded from `EntityTypes` in `lib/audit.js`.
- **From / To** — native `<input type="date">`. The API already handles
  start/end date.

Row details:
- **When** — `new Date(log.timestamp).toLocaleString()`.
- **Who** — `log.userId.name` (the `populate` from step 1). Fall back to
  `log.userId.email` then `unknown` if both missing (login events).
- **Action** — capitalize. Color-code: `delete`/`access_denied` red,
  `create`/`update` foreground, `read` muted. Use existing palette tokens
  (e.g. `text-destructive` for the red ones, `text-muted-foreground` for read).
- **Entity** — `{entityType} #{entityId.slice(-6)}`. If `entityType === "client"`,
  link to `/clients/<entityId>`. If `"session"`, link to `/sessions/<entityId>`.
  Otherwise plain text. (Owners already have visibility to everything in their
  practice, so the link is safe.)
- **IP** — small, muted-foreground, monospace.

Pagination: footer with `‹ Prev` / `Next ›` and "Page X of Y". Don't build a
page-number jumper — keep it simple.

Empty state: "No audit events match these filters." centered, muted.

Visual style: match `/team` and `/billing` — `bg-secondary` page background is
already inherited from the layout, table on `bg-white` with `rounded-lg`
`border border-border`. No card flourishes.

## 4. Nav link — owner-only

`src/app/components/Navbar.js` — there are already three `session.user.isPracticeOwner`
gated `<Link>` blocks (L188, L255, L306) for the "Team" link in the desktop and
mobile menus. Add an "Audit" link next to each one, same gate, same styling.

Place it AFTER "Team" in source order. Label: `Audit log`.

## 5. Non-goals (call out, do not build)

- **CSV/JSON export** — nice for compliance reviews, but `getAuditLogs` already
  has the data shape; we can add an `?export=csv` query later when actually
  needed for a HIPAA audit review. Skip in v1.
- **Clinician self-view** ("show me my own activity") — non-owners get the
  "ask your owner" view in v1. We can carve out a `?userId=me` self-only mode
  later, but it's not the use case for this round.
- **Action filter combinators** (multi-select, "everything except read") —
  one-at-a-time is fine for v1.
- **Real-time updates** — page is fetch-on-mount + refetch-on-filter-change. No
  websocket / polling.

## Acceptance

1. As **owner** at `admin@example.com`: `/audit` loads, shows the practice's
   audit events, and every filter combination round-trips through `/api/audit`
   and re-renders.
2. As **non-owner clinician** (any invited member): `/audit` renders the
   "audit log is managed by the practice owner" read-only view, and
   `GET /api/audit` returns 403 directly.
3. Cross-tenant check: spin up a second practice owner (or temporarily flip
   ownership via Mongo if needed), confirm one practice's owner cannot see the
   other practice's events. (The `practiceId` query filter is the test;
   `populate("userId")` will only return same-practice users because the User
   docs themselves are practice-scoped — but verify.)
4. `getAuditLogs({})` (no `practiceId`) throws.
5. Empty practice with no events shows the empty state, not an error.
6. The Audit log nav link is hidden for non-owners and visible for owners.
7. `npm run lint` clean; `npm run build` succeeds.

## Commits (do not bundle)

1. `feat(cognicare): scope getAuditLogs by practiceId, resolve actor names`
2. `feat(cognicare): GET /api/audit endpoint (owner-only, practice-scoped)`
3. `feat(cognicare): /audit page — owner-only audit log viewer`
4. `feat(cognicare): nav — owner-only Audit log link`
