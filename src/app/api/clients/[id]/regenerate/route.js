import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { logAuditEvent, auditMetaFromRequest, AuditActions, EntityTypes } from "@/lib/audit";
import AIReport from "@/models/aiReport";
import Session from "@/models/session";
import { runWorkflow } from "@/lib/ai/orchestrator";
import { diagnose } from "@/lib/ai/agents/diagnostic";
import { plan } from "@/lib/ai/agents/treatment";
import { persistReport } from "@/lib/report-utils";
import { resolveUpstream } from "@/lib/ai/upstream";
import { payloadHash } from "@/lib/hash";

// GET /api/clients/[id]/regenerate — may the intake chain still be re-derived?
// The UI uses this to decide whether to offer cascade regeneration at all, so a
// blocked client never sees a dead button.
export async function GET(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = await params;
  await connectDB();

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({
    cascadeAllowed: await cascadeAllowed(clientId, user.practiceId),
  });
}

// POST /api/clients/[id]/regenerate
//
// Two modes:
//   { sessionId }                              — post-session: re-run progress + documentation
//   { type: "intake-cascade", from: "assessment" | "diagnostic" }
//                                              — re-derive strictly-downstream intake artifacts
//
// Cascade rules: a human edit is terminal for the artifact edited — it is never
// re-derived. Only what sits DOWNSTREAM of the edit is regenerated, using the
// edit as input. Gated to pre-session so we never overwrite work that has
// already informed a real session.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = await params;
  const body = await req.json();

  await connectDB();

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (body?.type === "intake-cascade") {
    return intakeCascade({ req, user, clientId, from: body.from });
  }

  if (body?.type === "revise-treatment") {
    return reviseTreatment({ req, user, clientId });
  }

  const { sessionId } = body;
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  // Generate-first, delete-after: the superseded reports stay in the DB until
  // every new save has succeeded, so a mid-generation failure loses nothing.
  // They're hidden from agent context via excludeReportIds, and pickLatest
  // makes the brief overlap invisible in the UI.
  const oldScope = {
    clientId,
    sessionId,
    agentType: { $in: ["progress", "documentation"] },
    practiceId: user.practiceId,
  };
  const oldIds = (await AIReport.find(oldScope).select("_id").lean()).map((r) => r._id);

  let result;
  try {
    result = await runWorkflow({
      type: "post-session",
      clientId,
      sessionId,
      userId: user.id,
      practiceId: user.practiceId,
      excludeReportIds: oldIds,
    });
  } catch (e) {
    console.error("post-session regeneration failed:", e);
    // Roll back any partially saved new reports; the old ones are untouched.
    await AIReport.deleteMany({ ...oldScope, _id: { $nin: oldIds } }).catch(() => {});
    return NextResponse.json(
      { error: "Regeneration failed — your previous reports are unchanged." },
      { status: 500 }
    );
  }

  if (oldIds.length) await AIReport.deleteMany({ _id: { $in: oldIds } });

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.REGENERATE,
    entityType: EntityTypes.REPORT,
    entityId: clientId,
    details: { sessionId, type: "post-session" },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json(result);
}

// Revise the treatment plan: v(n+1) superseding the current plan, which is kept.
// This is the post-session counterpart to the intake cascade — where that one
// REPLACES hypothetical drafts, this one REVISES, preserving the version chain
// because a plan that has informed a real session is clinical history.
//
// Deliberately reuses the pre-session workflow rather than reimplementing the
// versioning: it takes no sessionId and already does load-prior → plan → save
// v(n+1) with the supersedes link. buildClientBlock feeds it the latest reports,
// so an edited diagnosis or assessment informs the revision with no new inputs.
async function reviseTreatment({ req, user, clientId }) {
  const prior = await AIReport.findOne({
    clientId,
    practiceId: user.practiceId,
    agentType: "treatment",
  }).sort({ version: -1, createdAt: -1 });

  if (!prior) {
    return NextResponse.json(
      { error: "No treatment plan to revise" },
      { status: 404 }
    );
  }

  const result = await runWorkflow({
    type: "pre-session",
    clientId,
    userId: user.id,
    practiceId: user.practiceId,
  });

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.REGENERATE,
    entityType: EntityTypes.REPORT,
    entityId: clientId,
    details: { type: "revise-treatment", supersededVersion: prior.version },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json(result);
}

// Pre-session gate: the intake chain is only re-derivable while it is still
// hypothetical. Once a session has been completed, or the plan has moved past
// v1, the artifacts carry clinical history we must not silently replace.
async function cascadeAllowed(clientId, practiceId) {
  const [completedSessions, advancedPlan] = await Promise.all([
    Session.countDocuments({ clientId, practiceId, status: "completed" }),
    AIReport.countDocuments({ clientId, practiceId, agentType: "treatment", version: { $gt: 1 } }),
  ]);
  return completedSessions === 0 && advancedPlan === 0;
}

async function intakeCascade({ req, user, clientId, from }) {
  if (!["assessment", "diagnostic"].includes(from)) {
    return NextResponse.json(
      { error: 'from must be "assessment" or "diagnostic"' },
      { status: 400 }
    );
  }

  if (!(await cascadeAllowed(clientId, user.practiceId))) {
    return NextResponse.json(
      { error: "Cascade regeneration is only available before the first completed session." },
      { status: 409 }
    );
  }

  const save = (env, extra = {}) =>
    persistReport({
      ...env,
      clientId,
      userId: user.id,
      practiceId: user.practiceId,
      ...extra,
    });

  // Generate-first, delete-after: the superseded client-level reports stay in
  // the DB until every new save has succeeded, so a mid-generation failure
  // loses nothing. They're hidden from agent context via excludeReportIds
  // (the new plan must not anchor on the drafts it's replacing), and
  // pickLatest makes the brief overlap invisible in the UI. Session-scoped
  // reports are never touched.
  const replacedTypes = from === "assessment" ? ["diagnostic", "treatment"] : ["treatment"];
  const oldScope = {
    clientId,
    practiceId: user.practiceId,
    agentType: { $in: replacedTypes },
    sessionId: null,
  };
  const oldIds = (await AIReport.find(oldScope).select("_id").lean()).map((r) => r._id);

  const result = {};
  // Capture upstream hashes BEFORE the agent calls — if upstream changes
  // mid-generation, the new artifacts must land already-stale.
  const upstream = await resolveUpstream(clientId, user.practiceId);

  try {
    if (from === "assessment") {
      // The edited assessment is the input. Diagnose takes it explicitly; plan
      // reads the fresh diagnostic back through buildClientBlock (the old one
      // is excluded, so the new save is the only diagnostic the plan sees).
      const { assessment } = upstream;
      if (!assessment) {
        return NextResponse.json({ error: "No assessment to regenerate from" }, { status: 404 });
      }
      const aHash = payloadHash(assessment.payload);

      const d = await diagnose({
        clientId,
        assessment: {
          agentType: "assessment",
          summary: assessment.summary,
          payload: assessment.payload,
        },
        excludeReportIds: oldIds,
      });
      await save(d, { status: "draft", sourceAssessmentHash: aHash });

      // The fresh in-memory diagnostic is the plan's upstream.
      const dHash = payloadHash(d.payload);
      const t = await plan({ clientId, excludeReportIds: oldIds });
      await save(t, {
        status: "draft",
        version: 1,
        sourceAssessmentHash: aHash,
        sourceDiagnosticHash: dHash,
      });

      result.diagnostic = d;
      result.treatment = t;
    } else {
      // from === "diagnostic": only the plan is downstream. buildClientBlock
      // picks up the edited diagnostic.
      const aHash = upstream.assessment ? payloadHash(upstream.assessment.payload) : undefined;
      const dHash = upstream.diagnostic ? payloadHash(upstream.diagnostic.payload) : undefined;

      const t = await plan({ clientId, excludeReportIds: oldIds });
      await save(t, {
        status: "draft",
        version: 1,
        sourceAssessmentHash: aHash,
        sourceDiagnosticHash: dHash,
      });

      result.treatment = t;
    }
  } catch (e) {
    console.error("intake-cascade regeneration failed:", e);
    // Roll back any partially saved new reports; the old ones are untouched.
    await AIReport.deleteMany({ ...oldScope, _id: { $nin: oldIds } }).catch(() => {});
    return NextResponse.json(
      { error: "Regeneration failed — your previous reports are unchanged." },
      { status: 500 }
    );
  }

  // All new saves succeeded — now retire the superseded reports.
  if (oldIds.length) await AIReport.deleteMany({ _id: { $in: oldIds } });

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.REGENERATE,
    entityType: EntityTypes.REPORT,
    entityId: clientId,
    details: { type: "intake-cascade", from },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json(result);
}
