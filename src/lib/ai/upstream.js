import AIReport from "../../models/aiReport.js";
import Client from "../../models/client.js";
import { notesHash, payloadHash } from "../hash.js";

// The ONE upstream resolver for the derivation chain — used by generation
// (intake, cascade, pre-session/revise) and by human-edit reconciliation, so
// "current upstream" can never mean two different things at two call sites.
//
// Relative imports (not "@/") and no connectDB: this module is also consumed
// by scripts/backfill-source-hashes.mjs under plain node, where the alias and
// the env-throwing mongodb module don't resolve. Callers must already hold a
// mongoose connection.
//
// Assessment/diagnostic are intake artifacts — client-level only (sessionId
// unset). Treatment is the latest version regardless of session linkage:
// pre-session revisions carry a sessionId but are still the current plan.
export async function resolveUpstream(clientId, practiceId) {
  const scope = practiceId ? { practiceId } : {};
  const [client, assessment, diagnostic, treatment] = await Promise.all([
    Client.findById(clientId),
    AIReport.findOne({ clientId, ...scope, agentType: "assessment", sessionId: null })
      .sort({ createdAt: -1 }),
    AIReport.findOne({ clientId, ...scope, agentType: "diagnostic", sessionId: null })
      .sort({ createdAt: -1 }),
    AIReport.findOne({ clientId, ...scope, agentType: "treatment" })
      .sort({ version: -1, createdAt: -1 }),
  ]);
  return { client, assessment, diagnostic, treatment };
}

// A human edit is terminal for the edited artifact AND constitutes manual
// reconciliation with its tracked upstreams as they exist right now: the
// clinician saw the current upstream while making the edit. Returns the
// source-hash fields to refresh; empty for untracked agent types.
//
// `session` (the report's own session, hydrated) is required only for the
// session edge: progress/documentation are derived from that session's notes.
export function reconciliationStamp(agentType, { client, assessment, diagnostic, session }) {
  switch (agentType) {
    case "assessment":
      return { sourceNotesHash: notesHash(client?.initialAssessment) };
    case "diagnostic":
      return assessment ? { sourceAssessmentHash: payloadHash(assessment.payload) } : {};
    case "treatment": {
      const stamp = {};
      if (assessment) stamp.sourceAssessmentHash = payloadHash(assessment.payload);
      if (diagnostic) stamp.sourceDiagnosticHash = payloadHash(diagnostic.payload);
      return stamp;
    }
    case "progress":
    case "documentation":
      return session ? { sourceNotesHash: notesHash(session.notes) } : {};
    default:
      return {};
  }
}
