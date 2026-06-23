import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";
import { getSession } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";

export async function GET(req, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    await connectDB();

    const allowed = await visibleClientIds(session.user);
    if (!allowed.some((id) => id.toString() === clientId)) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const mostRecentSession = await Session.findOne({
      clientId,
      practiceId: session.user.practiceId,
      status: "completed",
    })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    if (!mostRecentSession) {
      return NextResponse.json({
        reassessmentRecommended: false,
        rationale: "No previous sessions found",
      });
    }

    const progressReport = await AIReport.findOne({
      clientId,
      practiceId: session.user.practiceId,
      sessionId: mostRecentSession._id,
      agentType: "progress",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!progressReport || !progressReport.payload) {
      return NextResponse.json({
        reassessmentRecommended: false,
        rationale: "No progress reports found for the most recent session",
      });
    }

    const recommendReassessment = !!progressReport.payload.reassessmentRecommended;
    const rationale =
      progressReport.payload.recommendations?.[0] ||
      (recommendReassessment
        ? "Reassessment recommended by AI based on clinical factors"
        : "No reassessment recommended at this time");

    return NextResponse.json({
      reassessmentRecommended: recommendReassessment,
      rationale,
      lastSessionDate: mostRecentSession.completedAt || mostRecentSession.date,
    });
  } catch (error) {
    console.error("Error getting reassessment status:", error);
    return NextResponse.json({ error: "Failed to get reassessment status" }, { status: 500 });
  }
}
