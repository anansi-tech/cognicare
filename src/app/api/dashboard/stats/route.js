import { NextResponse } from "next/server";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import Report from "@/models/report";
import Practice from "@/models/practice";
import { dayRangeInTz } from "@/lib/timezone";

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

    // Today's schedule + a forward-looking "this week" count (Round 17).
    // Same scoping as the rest — clinicians see their own caseload only.
    const practice = await Practice.findById(practiceId).select("timezone").lean();
    const tz = practice?.timezone ?? "America/New_York";
    const { start: startOfToday, end: endOfToday } = dayRangeInTz(tz);
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [recentSessions, recentReports, todaysAppointmentsRaw, upcomingThisWeek] =
      await Promise.all([
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
        Session.find({
          ...sessionScope,
          status: "scheduled",
          date: { $gte: startOfToday, $lte: endOfToday },
        })
          .sort({ date: 1 })
          .populate("clientId", "name")
          .lean(),
        Session.countDocuments({
          ...sessionScope,
          status: "scheduled",
          date: { $gt: endOfToday, $lte: endOfWeek },
        }),
      ]);

    const todaysAppointments = todaysAppointmentsRaw.map((s) => ({
      id: s._id.toString(),
      clientName: s.clientId?.name ?? "Unknown",
      date: s.date,
      format: s.format,
      type: s.type,
    }));

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
        reportType: report.type,
        id: report._id.toString(),
        // Needed to deep-link to the real viewer at /clients/:cid/reports/:rid/view.
        clientId: report.clientId?._id?.toString() ?? null,
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
      todaysAppointments,
      upcomingThisWeek,
      timezone: tz,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
});
