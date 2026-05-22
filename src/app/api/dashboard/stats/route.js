import { NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import Report from "@/models/report";

export const GET = requireAuth(async (req) => {
  try {
    const user = await getCurrentUser();
    const counselorId = user.id;

    await connectDB();

    // Get total clients
    const totalClients = await Client.countDocuments({ counselorId });

    // Get active sessions (scheduled or in-progress)
    const activeSessions = await Session.countDocuments({
      counselorId,
      status: { $in: ["scheduled", "in-progress"] },
    });

    // Get completed sessions
    const completedSessions = await Session.countDocuments({
      counselorId,
      status: "completed",
    });

    // Get total reports
    const reportsGenerated = await Report.countDocuments({
      createdBy: counselorId,
      status: "completed",
    });

    // Get recent activity (last 5 items of each type)
    const [recentSessions, recentReports] = await Promise.all([
      Session.find({ counselorId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("clientId", "name")
        .lean(),
      Report.find({ counselorId })
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
