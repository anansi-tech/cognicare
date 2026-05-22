import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";
import Session from "@/models/session";

// Map risk levels to numerical values for charting
const riskLevelMap = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  severe: 4,
};

export async function GET(req, context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await context.params;

    await connectDB();

    // Get all sessions for the client
    const sessions = await Session.find({ clientId }).sort({ date: 1 }).lean();

    // Get all AI reports for the client
    const reports = await AIReport.find({
      clientId,
      counselorId: session.user.id,
    })
      .sort({ "metadata.timestamp": 1 })
      .lean();

    // Process the data for analytics
    const analytics = {
      moodTrends: sessions.map((s) => ({
        date: s.date,
        mood: s.moodRating,
        sessionId: s._id,
      })),
      riskLevels: reports
        .filter((r) => r.type === "assessment")
        .map((r) => {
          const riskLevelMap = {
            none: 0,
            low: 1,
            moderate: 2,
            high: 3,
            severe: 4,
          };
          const riskData = {
            date: new Date(r.metadata.timestamp).toISOString(),
            level: riskLevelMap[r.content.riskLevel?.toLowerCase()] ?? 0,
            levelText: r.content.riskLevel,
            sessionId: r.sessionId,
          };
          return riskData;
        }),
      treatmentProgress: reports
        .filter((r) => r.type === "progress")
        .map((r) => ({
          date: r.metadata.timestamp,
          metrics: {
            overallProgress: r.content.metrics?.overallProgress || 0,
            treatmentAdherence: r.content.metrics?.treatmentAdherence || 0,
            symptomSeverity: r.content.metrics?.symptomSeverity || 0,
            riskLevel: r.content.metrics?.riskLevel || 0,
          },
          goals: r.content.goalAchievementStatus || [],
          keyObservations: r.content.keyObservations || [],
          treatmentEffectiveness: r.content.treatmentEffectiveness || "",
          recommendations: r.content.recommendations || [],
        })),
      keyInsights: {
        riskFactors: reports
          .filter((r) => r.type === "assessment")
          .flatMap((r) => r.content.primaryConcerns || []),
        diagnoses: reports
          .filter((r) => r.type === "diagnostic")
          .flatMap((r) => r.content.primaryDiagnosis || []),
        treatmentGoals: reports
          .filter((r) => r.type === "progress")
          .flatMap((r) => r.content.goalAchievementStatus || [])
          .slice(-3), // Get the latest 3 goals
      },
    };

    console.log("Processed analytics:", analytics);
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
