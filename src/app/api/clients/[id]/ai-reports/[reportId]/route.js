import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { logAuditEvent, auditMetaFromRequest, AuditActions, EntityTypes } from "@/lib/audit";
import AIReport from "@/models/aiReport";

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
    .populate("counselorId", "name")
    .lean();
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

  if (payload) report.payload = { ...report.payload, ...payload };
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

  return NextResponse.json({ id: report._id, status: report.status, version: report.version, payload: report.payload });
}
