/**
 * Idempotent backfill (Round 54): stamp source-content hashes onto AIReports
 * whose stored hashes are missing OR carry an outdated scheme version.
 *
 * Pre-backfill staleness under the current scheme is unknowable, so every
 * report needing a stamp is marked as RECONCILED WITH CURRENT UPSTREAM — the
 * honest baseline. Prompts then appear only on real post-backfill divergence.
 * A hash already on the current HASH_VERSION is left alone, so re-running is
 * safe; run once after any deploy that bumps the version.
 *
 * Requires MONGODB_URI and PHI_ENCRYPTION_KEY (decryption + HMAC).
 *
 * Usage:
 *   node --env-file=.env.local scripts/backfill-source-hashes.mjs [--dry-run]
 */

import mongoose from "mongoose";
import AIReport from "../src/models/aiReport.js";
import Session from "../src/models/session.js";
import { resolveUpstream } from "../src/lib/ai/upstream.js";
import { notesHash, payloadHash, HASH_VERSION } from "../src/lib/hash.js";

// Missing or stamped under an older canonicalization scheme → re-stamp.
const needsStamp = (h) => !h || !h.startsWith(HASH_VERSION);

const isDryRun = process.argv.includes("--dry-run");

if (!process.env.MONGODB_URI || !process.env.PHI_ENCRYPTION_KEY) {
  console.error("MONGODB_URI and PHI_ENCRYPTION_KEY env vars required");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const TRACKED = ["assessment", "diagnostic", "treatment"];
const clientIds = await AIReport.distinct("clientId", { agentType: { $in: TRACKED } });
console.log(`Found ${clientIds.length} client(s) with tracked reports`);

let stamped = 0;
let skipped = 0;

for (const clientId of clientIds) {
  // Same resolver generation uses — client-level assessment/diagnostic,
  // latest treatment — so "current upstream" means the same thing here.
  const { client, assessment, diagnostic } = await resolveUpstream(clientId);
  const nHash = notesHash(client?.initialAssessment);
  const aHash = assessment ? payloadHash(assessment.payload) : null;
  const dHash = diagnostic ? payloadHash(diagnostic.payload) : null;

  const reports = await AIReport.find({ clientId, agentType: { $in: TRACKED } });
  for (const r of reports) {
    let changed = false;
    if (r.agentType === "assessment" && needsStamp(r.sourceNotesHash)) {
      r.sourceNotesHash = nHash;
      changed = true;
    }
    if ((r.agentType === "diagnostic" || r.agentType === "treatment") && needsStamp(r.sourceAssessmentHash) && aHash) {
      r.sourceAssessmentHash = aHash;
      changed = true;
    }
    if (r.agentType === "treatment" && needsStamp(r.sourceDiagnosticHash) && dHash) {
      r.sourceDiagnosticHash = dHash;
      changed = true;
    }
    if (!changed) {
      skipped++;
      continue;
    }
    stamped++;
    if (!isDryRun) await r.save();
  }
}

// Session edge (R54): session-scoped progress/documentation are derived from
// their session's notes — stamp as reconciled with those notes as they are now.
const SESSION_TRACKED = ["progress", "documentation"];
const sessionIds = await AIReport.distinct("sessionId", {
  agentType: { $in: SESSION_TRACKED },
  sessionId: { $ne: null },
});
console.log(`Found ${sessionIds.length} session(s) with session-scoped reports`);

for (const sessionId of sessionIds) {
  const session = await Session.findById(sessionId); // hydrated → decrypted notes
  const sHash = notesHash(session?.notes);
  const reports = await AIReport.find({ sessionId, agentType: { $in: SESSION_TRACKED } });
  for (const r of reports) {
    if (!needsStamp(r.sourceNotesHash)) {
      skipped++;
      continue;
    }
    r.sourceNotesHash = sHash;
    stamped++;
    if (!isDryRun) await r.save();
  }
}

console.log(
  `${isDryRun ? "[dry run] Would stamp" : "Stamped"} ${stamped} report(s); ${skipped} already current.`
);
if (isDryRun) console.log("Re-run without --dry-run to apply.");

await mongoose.disconnect();
