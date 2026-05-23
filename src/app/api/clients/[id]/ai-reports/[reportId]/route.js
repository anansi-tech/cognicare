import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import AIReport from "@/models/aiReport";

// GET a single AIReport (agent envelope) for this client.
// Used by the citation chip viewer at /clients/[id]/ai-reports/[reportId].
export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId, reportId } = await params;

  await connectDB();
  const report = await AIReport.findOne({
    _id: reportId,
    clientId,
    practiceId: user.practiceId,
  })
    .populate("counselorId", "name")
    .lean();
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ report });
}
