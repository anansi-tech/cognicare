import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Session from "@/models/session";
import AIReport from "@/models/aiReport";
import { getSession } from "@/lib/auth";

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

    // Get most recent documented session
    const mostRecentSession = await Session.findOne({
      clientId,
      documented: true,
    })
      .sort({ completedAt: -1 })
      .lean();

    if (!mostRecentSession) {
      return NextResponse.json({
        reassessmentRecommended: false,
        rationale: "No previous sessions found",
      });
    }

    // Find the progress report associated with this session
    const progressReport = await AIReport.findOne({
      clientId,
      sessionId: mostRecentSession._id,
      type: "progress",
    })
      .sort({ "metadata.timestamp": -1 })
      .lean();

    if (!progressReport || !progressReport.content) {
      return NextResponse.json({
        reassessmentRecommended: false,
        rationale: "No progress reports found for the most recent session",
      });
    }

    // Extract reassessment recommendation from progress report
    const recommendReassessment = !!progressReport.content.recommendReassessment;
    const rationale =
      progressReport.content.reassessmentRationale ||
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
