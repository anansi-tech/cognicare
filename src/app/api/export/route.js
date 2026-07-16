import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";
import Report from "@/models/report";
import { logAuditEvent, auditMetaFromRequest, AuditActions } from "@/lib/audit";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Export follows assignment visibility like everything else: a clinician
    // exports their own caseload; the practice owner exports the practice.
    const clientIds = await visibleClientIds(user);
    const clients = await Client.find({ _id: { $in: clientIds } });

    const sessions = await Session.find({ clientId: { $in: clientIds } });
    const aiReports = await AIReport.find({ clientId: { $in: clientIds } });
    const reports = await Report.find({ clientId: { $in: clientIds } }).lean();

    // Structure the data
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.name,
        totalClients: clients.length,
        totalSessions: sessions.length,
        totalReports: reports.length,
        totalAIReports: aiReports.length,
      },
      clients: clients.map((client) => ({
        ...client.toObject(),
        sessions: sessions.filter(
          (session) => session.clientId.toString() === client._id.toString()
        ),
        reports: reports.filter((report) => report.clientId.toString() === client._id.toString()),
        aiReports: aiReports.filter(
          (report) => report.clientId.toString() === client._id.toString()
        ),
      })),
    };

    // Log the export event
    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.EXPORT,
      entityType: "user",
      entityId: user.id,
      details: {
        exportType: "full",
        clientCount: clients.length,
        sessionCount: sessions.length,
        reportCount: reports.length,
      },
      ...auditMetaFromRequest(request),
    });

    // Return the data as JSON
    return NextResponse.json(exportData, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="cognicare_export_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
