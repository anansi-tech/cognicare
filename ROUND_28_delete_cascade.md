# Round 28 — Client delete cascade (fix orphaned records + storage)

> Branch `dev`, working dir `cognicare`. Deleting a client currently removes only the client +
> Sessions + Reports, **orphaning** five other record types (AIReports, ConsentForms, Invoices,
> LiamThreads, MeasureAdministrations) plus their GCS files. Data-integrity + PHI/compliance problem
> ("deleted" clients leaving clinical data behind). Make delete fully cascade.

## File
`src/app/api/clients/[id]/route.js` — the `DELETE` handler.

## What's missing (verified)
Models referencing `clientId`: `aiReport`, `consentForm`, `invoice`, `liamThread`,
`measureAdministration`, `session`, `report`. The handler deletes only `Session` + `Report`. The other
five orphan. GCS files also orphan: `invoice.documentKey`, `consentForm.documentKey` +
`signedDocumentKey`. A `deleteFile(key)` helper exists in `src/lib/storage.js`.

## The fix

Imports at top:
```js
import AIReport from "@/models/aiReport";
import ConsentForm from "@/models/consentForm";
import Invoice from "@/models/invoice";
import LiamThread from "@/models/liamThread";
import MeasureAdministration from "@/models/measureAdministration";
import { deleteFile } from "@/lib/storage";
```

In `DELETE`, after the client is found/deleted (keep the existing scope check +
`Client.findOneAndDelete({ _id: id, ...scope })`), replace the two `deleteMany`s with the full set.
**Collect GCS keys before deleting the DB rows**, then delete files best-effort:

```js
// gather storage keys first (before deleting the docs)
const [invoices, consents] = await Promise.all([
  Invoice.find({ clientId: id }).select("documentKey").lean(),
  ConsentForm.find({ clientId: id }).select("documentKey signedDocumentKey").lean(),
]);
const fileKeys = [
  ...invoices.map((i) => i.documentKey),
  ...consents.flatMap((c) => [c.documentKey, c.signedDocumentKey]),
].filter(Boolean);

// delete all related DB records
await Promise.all([
  Session.deleteMany({ clientId: id }),
  Report.deleteMany({ clientId: id }),
  AIReport.deleteMany({ clientId: id }),
  ConsentForm.deleteMany({ clientId: id }),
  Invoice.deleteMany({ clientId: id }),
  LiamThread.deleteMany({ clientId: id }),
  MeasureAdministration.deleteMany({ clientId: id }),
]);

// delete associated files best-effort (don't fail the whole op if storage hiccups)
await Promise.allSettled(fileKeys.map((k) => deleteFile(k)));
```

Keep the existing audit log call. Consider adding `details: { cascade: true }` to the audit entry so
the log reflects a full delete.

> Scope safety: the client itself is already scope-checked via `clientScope` before any of this runs,
> so a clinician can only trigger cascade for a client they're allowed to delete. The child
> `deleteMany`s are keyed by `clientId` (that client), which is correct — no extra practice scoping
> needed since they all belong to the now-verified client.

## Acceptance
1. Deleting a client removes: the client, Sessions, Reports, AIReports, ConsentForms, Invoices,
   LiamThreads, MeasureAdministrations — no orphans. Verify with a quick count by `clientId` after
   delete (all zero).
2. Associated GCS files (invoice docs, consent signed PDFs) are deleted; a storage failure on one file
   doesn't abort the delete (allSettled).
3. Scope check unchanged — only an authorized user can delete; 404 otherwise.
4. Audit entry still written (ideally noting cascade).
5. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
fix(cognicare): client delete cascades to all related records + storage files
```

## Note
This matters for PHI/compliance — a real "delete client" must leave nothing behind. Worth confirming
in the browser on a synthetic client that has sessions, an AI report set, a consent PDF, and an
invoice, then checking the DB/bucket are clean.
