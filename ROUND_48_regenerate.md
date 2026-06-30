# Round 48 — Regenerate button (post-session only), replace-with-confirm

> Branch `dev`, working dir `cognicare`. Add a deliberate "Regenerate" action on a completed session
> so a clinician can re-run the AI after notes change / a stale result. Replace semantics (delete old
> progress+SOAP, generate fresh) — but ALWAYS behind a confirmation, since it can discard
> approved/hand-edited work. **Scope: post-session ONLY.** Intake regenerate is deferred (its treatment
> version-chain handling is a separate, fiddlier problem).

## Backend — regenerate endpoint
New `POST /api/clients/[id]/regenerate` (scope-guarded, audited):
```js
// body: { sessionId }   — post-session only for now
```
- Delete this session's `progress` + `documentation` AIReports, then run the post-session workflow
  (which loads the notes — Round 47):
  ```js
  await AIReport.deleteMany({
    clientId, sessionId,
    agentType: { $in: ["progress", "documentation"] },
    practiceId: user.practiceId,
  });
  const result = await runWorkflow({ type: "post-session", clientId, sessionId, userId: user.id, practiceId: user.practiceId });
  return NextResponse.json(result);
  ```
- Scope-guard via `visibleClientIds` (404 if client not visible).
- Audit it (action: "regenerate", entityType: "report", details: { sessionId, type: "post-session" }).
- No consent gate needed here (post-session, consent already handled at intake).

## Frontend — Regenerate button + confirm
A `RegenerateButton` component (its own file or in `editable.jsx`):
- Subtle/secondary button labeled "Regenerate note & progress".
- On click → confirm dialog (a simple window.confirm is fine, or the app's dialog if one exists):
  "Regenerate will replace the current session note and progress report, including any edits you've
  approved. This can't be undone. Continue?"
- On confirm → POST `/api/clients/[id]/regenerate` with `{ sessionId }`, show a generating state
  ("Regenerating…"), call the refresh callback on done.
- Disabled while generating.

**Placement:** `SessionDetail.js`, near the SessionAIInsights / SOAP area. Show only when the session
is **completed AND a documentation report already exists** (i.e. there's something to regenerate —
the first generation still happens automatically via AutoPostSession). Pass `clientId`, `sessionId`,
and the existing AI-refresh callback so the view updates.

## The confirm IS the safety
Replace is destructive (deletes approved work). The confirmation is non-negotiable and must state that
approved/edited content will be lost.

## Acceptance
1. A completed session with an existing note shows a "Regenerate" action.
2. Clicking → confirm dialog warning approved content will be replaced → on confirm, old progress+SOAP
   are deleted and fresh ones generated from the current notes (no duplicates left behind).
3. The regenerated note/progress reflect the session's current notes (ties in with Round 47).
4. Scope-guarded + audited.
5. Intake reports are NOT touched (out of scope).
6. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
feat(cognicare): regenerate session note & progress (delete + re-run, with confirmation)
```

## Note
Post-session only. Intake regenerate (assessment/diagnostic/treatment) deferred — it needs careful
treatment-version-chain handling and isn't needed now. This lets you re-run a stale session (like the
one fixed in Round 47) from the UI instead of a manual DB delete.
