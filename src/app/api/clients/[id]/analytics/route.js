import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

// Minimal risk-over-time series from assessment reports.
// TODO(Round 3): replace with MBC-driven analytics (PHQ-9/GAD-7 trends via src/lib/mbc/trend.js).
const RISK_SCORE = { none: 0, low: 1, moderate: 2, high: 3, imminent: 4 };

export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;

  await connectDB();
  const assessments = await AIReport.find({
    clientId,
    practiceId: user.practiceId,
    agentType: "assessment",
  })
    .sort({ createdAt: 1 })
    .lean();

  const riskTimeline = assessments.map((r) => ({
    date: r.createdAt,
    level: RISK_SCORE[r.payload?.riskLevel] ?? 0,
    levelText: r.payload?.riskLevel ?? "none",
  }));

  return NextResponse.json({ riskTimeline });
}
