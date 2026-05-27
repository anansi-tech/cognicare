# Round 15 — Production-grade scheduling: recurrence + reminders + no-show tracking

> Branch `dev`, working dir `products/cognicare`. The `react-big-calendar` foundation is solid — this
> is **additive**, no rebuild. Three things: (1) simple recurring appointments (the headline gap),
> (2) client email reminders before appointments (Resend + Vercel Cron), (3) make no-show /
> cancellation meaningful. Reuse `lib/email.js` (R11) and the existing `vercel.json`.

## Why

Therapy is recurring — clients have standing weekly/biweekly slots. Today every session is created
manually (20 clients weekly = 20 manual entries/week, forever). And there's no appointment reminder
(no-shows are a real cost) and no-show/cancelled are dead-end statuses. The calendar itself is good;
these workflow pieces are what make it usable for a real practice.

## Part 1 — Simple recurring appointments

### Model: link a series
`src/models/session.js`, add:
```js
seriesId: { type: mongoose.Schema.Types.ObjectId, index: true }, // shared by sessions in one recurrence
// reminder + cancellation fields (Parts 2 & 3):
reminderSentAt: { type: Date },
cancellationReason: { type: String },
```
No separate "series" model — `seriesId` (a shared ObjectId) ties generated sessions together. Each
session stays an independent doc (editable/cancellable on its own).

### Generation: "repeat weekly/biweekly for N occurrences"
`SessionForm` (when creating, not editing): add an optional **Repeat** control —
`none | weekly | biweekly` and an **occurrences** count (default 8, **cap at 26**). When set,
`POST /api/sessions` creates the whole series up front.

`src/app/api/sessions/route.js` POST: if `recurrence` present, generate N sessions:
```js
const { recurrence } = body; // { frequency: "weekly"|"biweekly", occurrences: n } | undefined
if (recurrence?.frequency && recurrence.occurrences > 1) {
  const seriesId = new mongoose.Types.ObjectId();
  const stepDays = recurrence.frequency === "biweekly" ? 14 : 7;
  const count = Math.min(Math.max(parseInt(recurrence.occurrences) || 1, 1), 26);
  const docs = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(body.date);
    date.setDate(date.getDate() + i * stepDays);
    docs.push({ ...base, date, seriesId });
  }
  const created = await Session.insertMany(docs);
  return NextResponse.json({ sessions: created, seriesId }, { status: 201 });
}
// else: single session as today
```
> Each generated session is a normal, independent doc — editing/cancelling one does NOT touch the
> others (simple model; no "edit all future" complexity). That's the intended tradeoff.

### Deleting/cancelling a series (light touch)
On a session that has a `seriesId`, offer **"Cancel this one"** vs **"Cancel this and future in the
series"** (the latter: update/delete sessions in the series with `date >= this.date`). Keep it to
those two options — don't build full occurrence-exception editing.

## Part 2 — Appointment reminders (Resend + Vercel Cron)

A reminder needs a scheduled trigger. Use **Vercel Cron** → a daily endpoint that finds tomorrow's
appointments and emails the clients.

### Endpoint `src/app/api/cron/appointment-reminders/route.js`
```js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import Client from "@/models/client";
import { sendEmail } from "@/lib/email";

export const maxDuration = 60;

export async function GET(request) {
  // Protect the cron endpoint: Vercel sends Authorization: Bearer ${CRON_SECRET}
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  // tomorrow's window
  const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0,0,0,0);
  const end = new Date(start); end.setHours(23,59,59,999);

  const sessions = await Session.find({
    status: "scheduled",
    date: { $gte: start, $lte: end },
    reminderSentAt: { $exists: false },
  }).lean();

  let sent = 0;
  for (const s of sessions) {
    const client = await Client.findById(s.clientId).select("name contactInfo").lean();
    const to = client?.contactInfo?.email;
    if (!to) continue;
    try {
      await sendEmail({
        to,
        subject: "Appointment reminder",
        html: reminderHtml({ name: client.name, date: s.date, format: s.format }),
      });
      await Session.updateOne({ _id: s._id }, { $set: { reminderSentAt: new Date() } });
      sent++;
    } catch (e) { console.error("reminder failed", s._id, e); }
  }
  return NextResponse.json({ checked: sessions.length, sent });
}
```
`reminderHtml({ name, date, format })`: a short, warm reminder ("Hi {name}, this is a reminder of your
appointment on {formatted date/time}. {in-person location / telehealth note}."). Keep it simple; no
PHI beyond name + time.

### Cron config — extend `vercel.json`
```json
{
  "functions": { "src/app/api/**/route.js": { "maxDuration": 60 } },
  "crons": [
    { "path": "/api/cron/appointment-reminders", "schedule": "0 14 * * *" }
  ]
}
```
> `0 14 * * *` = daily at 14:00 UTC (~9am ET) — sends "tomorrow" reminders each morning. Set
> `CRON_SECRET` env. Vercel Cron auto-sends the `Authorization: Bearer ${CRON_SECRET}` header.
> Note in PR: client-timezone correctness is a future refinement; for one practice this is fine.
> Local dev: can't trigger Vercel Cron — test by hitting the endpoint manually with the bearer token.

## Part 3 — Make no-show / cancellation meaningful

The statuses exist (`no-show`, `cancelled`) but lead nowhere.

- **Capture a reason on cancel:** when status → `cancelled` (or `no-show`), prompt for an optional
  `cancellationReason`. Store it. Audit the status change.
- **Surface the pattern:** on the client header/overview, show a small **attendance signal** — e.g.
  "No-shows: N" / "Cancellations: N (last 90 days)" computed from their sessions. A simple count is
  enough; this flags clients with attendance issues, which is clinically and financially useful.
- **Don't remind cancelled/no-show/completed** — the cron already filters `status: "scheduled"`, so
  cancelled sessions won't get reminders. Good.

## Part 4 — Two smaller correctness items

- **Calendar visibility:** confirm `CalendarView` respects Round 10 scoping — a clinician sees their
  own sessions; the **owner** can see the whole practice's schedule. If `CalendarView`'s fetch isn't
  scoped, scope it (clinician → own; owner → practice). This matters for a multi-clinician practice.
- **Double-booking guard (light):** when creating a session (incl. each in a series), optionally warn
  if the counselor already has a `scheduled` session overlapping that time. A soft warning is enough —
  don't hard-block (therapists sometimes double-book intentionally for groups). Skip if it adds much
  churn; note as follow-up.

## Acceptance criteria

1. Booking with "repeat weekly × 8" creates 8 linked sessions (shared `seriesId`) on the calendar at
   the right dates; cap at 26 enforced. Editing/cancelling one doesn't affect the others.
2. "Cancel this and future" cancels the series from that date forward; "Cancel this one" affects only
   the one.
3. Hitting `/api/cron/appointment-reminders` (with the bearer token) emails clients whose appointment
   is tomorrow, marks `reminderSentAt`, and doesn't double-send on a second run. Wrong/no token → 401.
4. Cancelling a session captures an optional reason; the client overview shows a no-show/cancellation
   count. Status changes are audited.
5. Calendar respects visibility (clinician own / owner all).
6. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
feat(cognicare): recurring appointments — seriesId + generate weekly/biweekly up front
feat(cognicare): cancel-this-vs-this-and-future for a session series
feat(cognicare): appointment reminder cron (Resend) + vercel.json cron config
feat(cognicare): capture cancellation reason; client attendance (no-show) signal
fix(cognicare): scope calendar to clinician (own) / owner (practice)
```

## Manual setup (PR note)
- Set `CRON_SECRET` env (any strong random string) on Vercel.
- Vercel Cron runs only on deployed (Preview/Prod) — verify after deploy; locally, hit the endpoint
  manually with the bearer token to test.

## Next flow
After scheduling, the natural remaining flows to review: the **dashboard/stats** surface and the
**client intake/onboarding** form itself. Then the dead-code audit, the landing/theme revamp, and
PHI last.
