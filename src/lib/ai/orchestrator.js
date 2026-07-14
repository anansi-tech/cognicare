import { assess } from "./agents/assessment";
import { diagnose } from "./agents/diagnostic";
import { plan } from "./agents/treatment";
import { evaluateProgress } from "./agents/progress";
import { document as documentSession } from "./agents/documentation";
import { persistReport } from "@/lib/report-utils";
import Session from "@/models/session";
import { connectDB } from "@/lib/mongodb";
import { resolveUpstream } from "./upstream";
import { notesHash, payloadHash } from "@/lib/hash";

// Each workflow runs in-process, sequentially, passing prior outputs forward, persisting each.
//
// Source-hash rule (R54): capture each upstream's content hash BEFORE invoking
// the agent that consumes it, and persist those captured values with the
// result. Never reload upstream afterwards to compute the stamp — if upstream
// changed mid-generation, the artifact must land already-stale.
// `excludeReportIds`: superseded reports still in the DB during regeneration
// (new artifacts save first; deletion happens after) — hidden from agent context.
export async function runWorkflow({ type, clientId, sessionId, userId, practiceId, sessionData, excludeReportIds }) {
  const save = (env, extra = {}) =>
    persistReport({ ...env, clientId, sessionId, userId, practiceId, ...extra });

  if (type === "intake") {
    await connectDB();
    const { client } = await resolveUpstream(clientId, practiceId);
    const nHash = notesHash(client?.initialAssessment);
    const a = await assess({ clientId, sessionData });
    await save(a, { status: "draft", sourceNotesHash: nHash });
    // Hash the exact in-memory envelope handed to diagnose, not a re-read.
    const aHash = payloadHash(a.payload);
    const d = await diagnose({ clientId, assessment: a });
    await save(d, { status: "draft", sourceAssessmentHash: aHash });
    const dHash = payloadHash(d.payload);
    const t = await plan({ clientId });
    await save(t, {
      status: "draft",
      version: 1,
      sourceAssessmentHash: aHash,
      sourceDiagnosticHash: dHash,
    });
    return { assessment: a, diagnostic: d, treatment: t };
  }
  if (type === "pre-session") {
    await connectDB();
    const { assessment, diagnostic, treatment: prior } = await resolveUpstream(clientId, practiceId);
    const aHash = assessment ? payloadHash(assessment.payload) : undefined;
    const dHash = diagnostic ? payloadHash(diagnostic.payload) : undefined;
    const t = await plan({ clientId, priorPlan: prior });
    await save(t, {
      status: "draft",
      version: (prior?.version ?? 0) + 1,
      supersedes: prior?._id,
      sourceAssessmentHash: aHash,
      sourceDiagnosticHash: dHash,
    });
    return { treatment: t };
  }
  if (type === "post-session") {
    // Load the just-completed session so agents see the clinician's notes.
    // Server-authoritative — don't rely on the client sending sessionData.
    await connectDB();
    const dbSession = await Session.findById(sessionId);
    const sd = sessionData ?? (dbSession ? {
      notes: dbSession.notes ?? "",
      date: dbSession.date,
      sessionType: dbSession.type,
      attendance: dbSession.status,
    } : null);
    // Session edge (R54): both artifacts derive from these notes — capture the
    // hash BEFORE the agent calls so a mid-generation edit lands already-stale.
    const sNotesHash = notesHash(sd?.notes);
    const p = await evaluateProgress({ clientId, sessionData: sd, excludeReportIds });
    await save(p, { status: "draft", sourceNotesHash: sNotesHash });
    const doc = await documentSession({ clientId, progress: p, sessionData: sd, excludeReportIds });
    await save(doc, { sourceNotesHash: sNotesHash });
    return { progress: p, documentation: doc };
  }
  throw new Error(`Unknown workflow type: ${type}`);
}
