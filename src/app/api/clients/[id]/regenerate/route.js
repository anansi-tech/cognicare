import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { logAuditEvent, auditMetaFromRequest, AuditActions, EntityTypes } from "@/lib/audit";
import AIReport from "@/models/aiReport";
import { runWorkflow } from "@/lib/ai/orchestrator";

// POST /api/clients/[id]/regenerate
// body: { sessionId }
// Deletes this session's progress + documentation AIReports then re-runs the
// post-session workflow (which loads session.notes server-side from Round 47).
// Scope-guarded and audited. Post-session only — intake is out of scope.
export async function POST(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clientId } = await params;
  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  await connectDB();

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

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
