import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Report from "@/models/report";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Resolve a report only if the caller can see its parent client (Round 14
// confidentiality rule — same as everywhere else).
async function resolveReport({ clientId, reportId, user }) {
  const scope = await clientScope(user);
  const visible = await Client.findOne({ _id: clientId, ...scope }).select("_id").lean();
  if (!visible) return null;
  return Report.findOne({
    _id: reportId,
    clientId,
    practiceId: user.practiceId,
  });
}

export async function GET(_request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, reportId } = await params;
    await connectDB();

    const report = await resolveReport({ clientId: id, reportId, user });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    await report.populate("createdBy", "name");
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

// PATCH: edit narrative + flip draft -> completed. Audit completion (a
// reviewed report is the deliverable; flagging that transition matters).
export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, reportId } = await params;
    const body = await request.json();
    await connectDB();

    const report = await resolveReport({ clientId: id, reportId, user });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const previousStatus = report.status;
    if (typeof body.narrative === "string") {
      const existing = report.content && typeof report.content === "object" ? report.content : {};
      report.content = { ...existing, narrative: body.narrative };
      report.markModified("content");
    }
    if (body.status === "completed" || body.status === "draft") {
      report.status = body.status;
    }
    await report.save();

    if (previousStatus !== report.status) {
      await logAuditEvent({
        userId: user.id,
        practiceId: user.practiceId,
        action: AuditActions.UPDATE,
        entityType: EntityTypes.REPORT,
        entityId: report._id,
        details: { clientId: id, previousStatus, newStatus: report.status },
        ...auditMetaFromRequest(request),
      });
    }

    await report.populate("createdBy", "name");
    return NextResponse.json({ report });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, reportId } = await params;
    await connectDB();

    const report = await resolveReport({ clientId: id, reportId, user });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    await report.deleteOne();

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.DELETE,
      entityType: EntityTypes.REPORT,
      entityId: report._id,
      details: { clientId: id, type: report.type },
      ...auditMetaFromRequest(request),
    });

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
