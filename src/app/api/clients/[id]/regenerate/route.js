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

  await AIReport.deleteMany({
    clientId,
    sessionId,
    agentType: { $in: ["progress", "documentation"] },
    practiceId: user.practiceId,
  });

  const result = await runWorkflow({
    type: "post-session",
    clientId,
    sessionId,
    userId: user.id,
    practiceId: user.practiceId,
  });

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

  // Client-level (intake) artifacts only — never touch session-scoped reports.
  const dropClientLevel = (agentTypes) =>
    AIReport.deleteMany({
      clientId,
      practiceId: user.practiceId,
      agentType: { $in: agentTypes },
      sessionId: null,
    });

  const result = {};
  // Capture upstream hashes BEFORE the agent calls — if upstream changes
  // mid-generation, the new artifacts must land already-stale.
  const upstream = await resolveUpstream(clientId, user.practiceId);

  if (from === "assessment") {
    // The edited assessment is the input. Diagnose takes it explicitly; plan
    // reads the fresh diagnostic back through buildClientBlock.
    const { assessment } = upstream;
    if (!assessment) {
      return NextResponse.json({ error: "No assessment to regenerate from" }, { status: 404 });
    }
    const aHash = payloadHash(assessment.payload);

    await dropClientLevel(["diagnostic", "treatment"]);

    const d = await diagnose({
      clientId,
      assessment: {
        agentType: "assessment",
        summary: assessment.summary,
        payload: assessment.payload,
      },
    });
    await save(d, { status: "draft", sourceAssessmentHash: aHash });

    // The fresh in-memory diagnostic is the plan's upstream.
    const dHash = payloadHash(d.payload);
    const t = await plan({ clientId });
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

    await dropClientLevel(["treatment"]);

    const t = await plan({ clientId });
    await save(t, {
      status: "draft",
      version: 1,
      sourceAssessmentHash: aHash,
      sourceDiagnosticHash: dHash,
    });

    result.treatment = t;
  }

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
