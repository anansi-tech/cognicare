import { NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import Report from "@/models/report";

export const GET = requireAuth(async (req) => {
  try {
    const user = await getCurrentUser();
    const practiceId = user.practiceId;

    await connectDB();

    // Practice-scoped counts — every clinician in the practice sees the
    // same totals (which IS the dashboard story for a multi-clinician
    // practice; identical to today for a solo practice).
    const totalClients = await Client.countDocuments({ practiceId });

    const activeSessions = await Session.countDocuments({
      practiceId,
      status: { $in: ["scheduled", "in-progress"] },
    });

    const completedSessions = await Session.countDocuments({
      practiceId,
      status: "completed",
    });

    const reportsGenerated = await Report.countDocuments({
      practiceId,
      status: "completed",
    });

    const [recentSessions, recentReports] = await Promise.all([
      Session.find({ practiceId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("clientId", "name")
        .lean(),
      Report.find({ practiceId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("clientId", "name")
        .lean(),
    ]);

    // Format recent activity
    const recentActivity = [
      ...recentSessions.map((session) => ({
        type: "session",
        date: session.createdAt,
        clientName: session.clientId?.name || "Unknown Client",
        status: session.status,
        id: session._id.toString(),
        duration: session.duration,
      })),
      ...recentReports.map((report) => ({
        type: "report",
        date: report.createdAt,
        clientName: report.clientId?.name || "Unknown Client",
        status: report.status,
        id: report._id.toString(),
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return NextResponse.json({
      totalClients,
      activeSessions,
      completedSessions,
      reportsGenerated,
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
});
