# Round 54 (final) — Content-hash staleness across the derivation chain

> Branch `dev`, working dir `cognicare`. Replaces all timestamp staleness proxies (notes banner, R51
> cascade offers, R52 revise nudges) with content hashes. Invariant: **each artifact records the
> content hash of its tracked direct upstream clinical artifacts, captured when it is generated or
> manually reconciled.** Staleness = current upstream hash ≠ stored hash. Reverts clear prompts;
> human edits reconcile; NO legacy fallback (one-off backfill instead — no wipe).

## 1. Hash helpers — server-side ONLY (`src/lib/hash.js`)
```js
import { createHmac } from "crypto";
const KEY = process.env.PHI_ENCRYPTION_KEY;
const hmac = (s) => "v1:" + createHmac("sha256", KEY).update(s).digest("hex");
export const notesHash = (s) => hmac(s ?? "");
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
    : v;
export const payloadHash = (p) => hmac(JSON.stringify(canon(p ?? {})));
```
- HMAC (existing PHI key) not raw SHA — hashes contain no plaintext PHI but stay protected clinical
  metadata. `v1:` prefix so a future canonicalization change can't silently mark everything stale.
- Never hash in the browser.

## 2. Model fields (`src/models/aiReport.js`, plain String, unencrypted)
```js
sourceNotesHash,        // assessment: intake notes
sourceAssessmentHash,   // diagnostic + treatment
sourceDiagnosticHash,   // treatment
```

## 3. Stamp at generation — capture BEFORE the AI call
Rule: capture upstream payloads + hashes **before** invoking the agent; persist those captured values
with the result. Never reload upstream post-generation to compute the stamp (if upstream changed
mid-generation, the artifact must be immediately stale — conservative and correct).
- Intake: hash notes before `assess`; hash `a.payload` (the in-memory envelope passed to `diagnose`);
  hash `d.payload` before `plan`. Stamp assessment/diagnostic/treatment-v1 accordingly.
- Cascade (`intake-cascade`), pre-session revision, `revise-treatment`: same — resolve upstream(s)
  immediately before the agent call, capture hashes, persist with the new artifact/version.
- **One shared upstream resolver**, used by generation AND reconciliation: practice-scoped,
  client-level (`sessionId: null`) where appropriate, latest treatment = highest `version` then
  `createdAt`. No duplication across the four call sites.

## 4. Human-edit reconciliation (the Sol amendment — core)
Human edits are terminal AND constitute manual reconciliation with current upstream. In the report
PATCH route, **inside the existing "payload actually changed" branch only** (approve-without-edit
must refresh nothing):
- assessment edited → refresh `sourceNotesHash` from current intake notes
- diagnostic edited → refresh `sourceAssessmentHash` from current assessment payload
- treatment edited → refresh `sourceAssessmentHash` + `sourceDiagnosticHash`
Resulting behavior: assessment edited → diagnosis stale; clinician manually fixes diagnosis →
assessment→diagnosis clears, diagnosis→treatment becomes stale (its content changed). Exactly
"human edits are terminal; cascade only downstream."

## 5. Staleness conditions (replace ALL timestamp checks)
API: `GET /api/clients/[id]` adds computed `initialAssessmentHash`; ai-reports GET adds computed
`payloadHash` per report (stored source hashes ride along on the docs).
- Notes banner: `client.initialAssessmentHash !== assessment.sourceNotesHash`
- Pre-session offers: `assessment.payloadHash !== diagnostic.sourceAssessmentHash`;
  `diagnostic.payloadHash !== treatment.sourceDiagnosticHash`
- Post-session nudges: same two comparisons vs the LATEST treatment version (diagnostic precedence
  unchanged).
- `editedAt` and `initialAssessmentUpdatedAt` are REMOVED from all staleness conditions (fields may
  remain; stop reading them for this).

## 6. Backfill instead of legacy fallback (no wipe, no dual-path)
One-off idempotent script `scripts/backfill-source-hashes.js`: for each client, resolve current
upstream content and stamp every existing report's missing source hashes as **reconciled with current
upstream** (pre-R54 staleness is unknowable; current state = reconciled is the honest baseline).
Skip reports that already have hashes. Run once against prod after deploy. NO timestamp fallback
branches anywhere in the app code.

## 7. Unchanged
Baseline-measures trigger; `cascadeAllowed` gate; one-nudge precedence; confirm dialogs; versioning;
delete-before-generate pre-session semantics (intentional per R51). Whitespace edits count (no
normalization). Summary not hashed (not clinician-editable).

## Acceptance
1. Notes: edit→banner; revert→gone. Manually edit assessment → notes→assessment staleness clears.
2. Assessment change → diagnosis stale; manually edit diagnosis → that clears AND diagnosis→treatment
   becomes stale; manually edit treatment → clears.
3. Post-session: edit diagnosis → revise nudge; revert → gone; revise plan → gone (new version stamps
   the edited diagnosis).
4. Approve without payload change refreshes no hashes, triggers nothing.
5. Upstream changed mid-generation → artifact lands already-stale (never falsely current).
6. Backfill run: existing reports show no prompts until a REAL post-backfill divergence; script
   idempotent; client-level vs session-level reports never confused by the resolver.
7. Tests per edge: unchanged/changed/reverted + reconciliation-on-edit + canonical key-order. Lint/
   build clean.

## Commit
```
fix(cognicare): content-hash staleness (generation + human-edit reconciliation); backfill, drop timestamp proxies
```
