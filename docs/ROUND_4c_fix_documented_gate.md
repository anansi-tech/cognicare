# Round 4c — Fix the dead post-session trigger (`documented` is vestigial)

> Hand to Claude Code. Branch `dev`, working dir `products/cognicare`. Small, surgical fix.
> Bug: `session.documented` defaults to `false` and is **never set to `true`** anywhere in the write
> path (the old `AIWorkflow` flow that set it was deleted in 4a). But `AutoPostSession` and several
> reads gate on it — so post-session never fires (no progress report, no draft note), and
> reassessment-status / report-gathering silently match nothing. Fix: drop the `documented` gate.
> A **completed** session (which already requires notes via `SessionForm` validation) is the trigger.

## Changes

1. **`src/components/ai/AutoPostSession.jsx`** — remove the `documented` dependency.
   Eligibility becomes just the completed status (notes are guaranteed by the form):
   ```js
   const eligible = sessionStatus === "completed" && !!clientId && !!sessionId;
   ```
   Drop the `documented` prop from the signature and remove it from the deps.

2. **`src/app/components/sessions/SessionDetail.js`**
   - The post-session/note area is gated at `{session.documented && ( … )}` (~L326). Change the gate
     to `{session.status === "completed" && ( … )}`.
   - Where it renders `<AutoPostSession … documented={session.documented} />` (~L343), remove the
     `documented` prop.

3. **`src/models/session.js`** — delete the `documented` field. (Leave `completedAt` for now — it's
   harmless.)

4. **`src/lib/report-utils.js`** — in `getClientSessions`, the query filters `documented: true`.
   Change to `status: "completed"` so it actually returns completed sessions.

5. **`src/app/api/clients/[id]/reassessment-status/route.js`** — same: the session query filters
   `documented: true`. Change to `status: "completed"`.

6. Grep: `grep -rn "documented" src` → nothing.

## Acceptance criteria

1. Create a session, mark it **Completed** with notes, save → on the session page, without any
   button, "Writing the session note…" appears, then a **Draft** SOAP note renders. (Previously this
   never happened.)
2. `grep -rn "documented" src` → nothing; `npm run lint` clean.
3. Reassessment status and the Reports gathering see completed sessions (no longer silently empty).

## Commit

```
fix(cognicare): drop vestigial `documented` gate — completing a session triggers post-session
```

After this, I write the end-to-end test against the full clean flow and we run it together.
