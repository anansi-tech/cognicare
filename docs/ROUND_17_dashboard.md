# Round 17 — Dashboard: today's schedule + papercut fixes + Overview cleanup

> Branch `dev`, working dir `products/cognicare`. The dashboard's data layer is already good (properly
> scoped, meaningful counts). This round adds the one thing it's missing — **today's appointments**
> (the reason a therapist opens the app) plus a this-week count — fixes two confirmed bugs, and
> removes the redundant Recent Sessions/Reports blocks from the client Overview.

## Part 1 — Appointments on the dashboard (the valuable add)

Now that Round 15 added real scheduling, the dashboard should answer "who am I seeing today?"

### Extend the stats endpoint
`src/app/api/dashboard/stats/route.js` — add today's + this-week's scheduled sessions, scoped the
same way (already uses `visibleClientIds` — good):
```js
const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
const endOfToday = new Date(); endOfToday.setHours(23,59,59,999);
const endOfWeek = new Date(startOfToday); endOfWeek.setDate(endOfWeek.getDate() + 7);

const todaysAppointments = await Session.find({
  ...sessionScope, status: "scheduled", date: { $gte: startOfToday, $lte: endOfToday },
}).sort({ date: 1 }).populate("clientId", "name").lean();

const upcomingThisWeek = await Session.countDocuments({
  ...sessionScope, status: "scheduled", date: { $gt: endOfToday, $lte: endOfWeek },
});

// add to the JSON response:
//   todaysAppointments: todaysAppointments.map(s => ({
//     id: s._id.toString(), clientName: s.clientId?.name ?? "Unknown",
//     date: s.date, format: s.format, type: s.type })),
//   upcomingThisWeek,
```

### Render on the dashboard
`src/app/(dashboard)/dashboard/page.js` — add a prominent **"Today's Schedule"** section (above or
beside the stat cards): a list of today's appointments (time · client name · format), each linking to
`/sessions/{id}`. If none today: a calm "No appointments today." Add a small **"{n} more this week"**
line/badge linking to the calendar. Keep the existing stat cards.

> This is the highest-value pixel on the dashboard — make it the first thing the eye lands on.

## Part 2 — Fix two confirmed bugs

1. **Dead initial-state keys:** the page's `useState` declares `totalSessions: 0, totalReports: 0`
   which are never used (the API returns `activeSessions`/`completedSessions`/`reportsGenerated`).
   Remove `totalSessions` and `totalReports` from the initial state. Add `todaysAppointments: []` and
   `upcomingThisWeek: 0` to match the new response.

2. **Recent-activity report link 404:** `handleActivityClick` routes reports to `/reports/${id}` —
   **that page does not exist** (no `src/app/reports/[id]/`). The real viewer is
   `/clients/[clientId]/reports/[reportId]/view`. Fix: include `clientId` in the `recentActivity`
   report items from the endpoint, and route to
   `/clients/${activity.clientId}/reports/${activity.id}/view`. (Sessions link is fine.)
   - Endpoint: in the `recentReports.map`, add `clientId: report.clientId?._id?.toString()`.

## Part 3 — Remove redundant Overview blocks (the ones you flagged)

`src/app/components/clients/ClientDetail.js` — in the **overview** tab, delete the entire
"Recent Activity" grid (the "Recent Sessions" + "Recent Reports" two-column block, ~L740–795). The
dedicated **Sessions** and **Reports** tabs already do this properly, and "Recent Reports" here is
also broken (references `report.title`, which the Report model doesn't have).

- Keep the **"+ Add New Session"** affordance — move it up near the Overview header or the Sessions
  area so the quick action isn't lost (it's the only useful part of that block).
- Remove the now-unused `recentSessions` / `recentReports` fetches + state that fed only those blocks
  (grep to confirm they're not used elsewhere in the component before deleting).
- Result: Overview = the AI clinical picture (`ClientInsights`) + identity/contact + initial
  assessment. Focused, no duplication.

## Acceptance criteria

1. Dashboard shows **Today's Schedule** (today's scheduled appointments, time + client, linking to the
   session) and a **"{n} this week"** indicator; empty today → calm message.
2. Clicking a report in Recent Activity opens the real report viewer (no 404). Clicking a session
   opens the session.
3. Dashboard initial state has no dead `totalSessions`/`totalReports` keys; stats render correctly.
4. Client Overview no longer shows Recent Sessions/Reports blocks; "+ Add New Session" still
   reachable; Sessions/Reports tabs unaffected; no leftover unused fetches.
5. All dashboard numbers remain practice/assignment scoped (clinician own / owner all).
6. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
feat(cognicare): dashboard today's schedule + this-week count (scoped)
fix(cognicare): dashboard recent-activity report link (correct viewer, no 404); drop dead state keys
refactor(cognicare): remove redundant Recent Sessions/Reports from client Overview
```

## Next: dead-code audit
With the major flows reviewed (consent, reports, scheduling, intake, dashboard), the natural finale
before the visual revamp is the **systematic dead-code audit** — I'll grep the whole codebase for
unreferenced files, unused exports, orphaned components/routes, and leftover pre-refactor remnants,
and hand you a "confirmed dead / probably dead / keep" report so you delete with evidence. Then the
landing/theme/animation revamp, then PHI last.
