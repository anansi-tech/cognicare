import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";
import Report from "@/models/report";
import { logAuditEvent, AuditActions } from "@/lib/audit";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get all data for the therapist
    const clients = await Client.find({ counselorId: user.id }).lean();
    const clientIds = clients.map((client) => client._id);

    const sessions = await Session.find({ clientId: { $in: clientIds } }).lean();
    const aiReports = await AIReport.find({ clientId: { $in: clientIds } }).lean();
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
        ...client,
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
      action: AuditActions.EXPORT,
      entityType: "user",
      entityId: user.id,
      details: {
        exportType: "full",
        clientCount: clients.length,
        sessionCount: sessions.length,
        reportCount: reports.length,
      },
      ipAddress: request.headers.get("x-forwarded-for") || request.ip,
      userAgent: request.headers.get("user-agent"),
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
