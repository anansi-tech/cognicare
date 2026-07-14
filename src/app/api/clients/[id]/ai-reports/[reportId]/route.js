import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { logAuditEvent, auditMetaFromRequest, AuditActions, EntityTypes } from "@/lib/audit";
import AIReport from "@/models/aiReport";
import Session from "@/models/session";
import { resolveUpstream, reconciliationStamp } from "@/lib/ai/upstream";
import { payloadHash } from "@/lib/hash";

// GET a single AIReport (agent envelope) for this client.
// Used by the citation chip viewer at /clients/[id]/ai-reports/[reportId].
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId, reportId } = await params;

  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  const report = await AIReport.findOne({
    _id: reportId,
    clientId,
    practiceId: user.practiceId,
  })
    .populate("counselorId", "name");
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ report });
}

// PATCH any AIReport: edit payload fields and/or set status to draft/approved.
export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId, reportId } = await params;
  const { payload, status } = await req.json();

  await connectDB();
  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === clientId)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report = await AIReport.findOne({
    _id: reportId,
    clientId,
    practiceId: user.practiceId,
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  // Approve always PATCHes the payload (unchanged or not), so presence of the
  // key proves nothing; compare against what's stored. Only a REAL change is a
  // human edit — and a human edit is also manual reconciliation with current
  // upstream (the Sol amendment): the clinician made this edit looking at the
  // upstream as it exists now, so the source hashes refresh to match it.
  // Approve-without-edit refreshes nothing and stamps nothing.
  if (payload) {
    const next = { ...report.payload, ...payload };
    if (JSON.stringify(next) !== JSON.stringify(report.payload)) {
      report.payload = next;
      report.editedAt = new Date();
      const upstream = await resolveUpstream(clientId, user.practiceId);
      // Session edge: progress/documentation reconcile against their own
      // session's current notes, not a client-level artifact.
      if ((report.agentType === "progress" || report.agentType === "documentation") && report.sessionId) {
        upstream.session = await Session.findById(report.sessionId);
      }
      Object.assign(report, reconciliationStamp(report.agentType, upstream));
    }
  }
  if (status && ["draft", "approved"].includes(status)) report.status = status;
  await report.save();

  logAuditEvent({
    userId: user.id,
    practiceId: user.practiceId,
    action: AuditActions.UPDATE,
    entityType: EntityTypes.REPORT,
    entityId: report._id,
    details: { agentType: report.agentType, status: report.status, version: report.version },
    ...auditMetaFromRequest(req),
  });

  // Re-fetch so post("init") decrypts payload — pre("save") encrypts it in-place.
  // Hashes ride along so the client's in-memory report stays coherent with the
  // hash-based staleness checks without a full refetch.
  const fresh = await AIReport.findById(report._id);
  return NextResponse.json({
    id: fresh._id,
    status: fresh.status,
    version: fresh.version,
    payload: fresh.payload,
    editedAt: fresh.editedAt,
    payloadHash: payloadHash(fresh.payload),
    sourceNotesHash: fresh.sourceNotesHash,
    sourceAssessmentHash: fresh.sourceAssessmentHash,
    sourceDiagnosticHash: fresh.sourceDiagnosticHash,
  });
}
