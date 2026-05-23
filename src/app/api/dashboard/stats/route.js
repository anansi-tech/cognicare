import { NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import Report from "@/models/report";

export const GET = requireAuth(async (req) => {
  try {
    const user = await getCurrentUser();
    const practiceId = user.practiceId;

    await connectDB();

    // Assignment-based stats: clinicians see numbers for their own caseload;
    // owners see everything in the practice. Sessions/Reports inherit from
    // client visibility.
    const allowedClientIds = await visibleClientIds(user);
    const totalClients = allowedClientIds.length;

    const sessionScope = { practiceId, clientId: { $in: allowedClientIds } };
    const reportScope = { practiceId, clientId: { $in: allowedClientIds } };

    const activeSessions = await Session.countDocuments({
      ...sessionScope,
      status: { $in: ["scheduled", "in-progress"] },
    });

    const completedSessions = await Session.countDocuments({
      ...sessionScope,
      status: "completed",
    });

    const reportsGenerated = await Report.countDocuments({
      ...reportScope,
      status: "completed",
    });

    const [recentSessions, recentReports] = await Promise.all([
      Session.find(sessionScope)
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("clientId", "name")
        .lean(),
      Report.find(reportScope)
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
