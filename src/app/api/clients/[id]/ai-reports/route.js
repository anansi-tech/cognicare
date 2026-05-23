import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import AIReport from "@/models/aiReport";

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get("agentType") ?? searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sessionId = searchParams.get("sessionId");
    const limit = searchParams.get("limit");

    await connectDB();

    // Scope to the practice so a clinician can only read their practice's
    // clients' reports.
    const query = { clientId, practiceId: session.user.practiceId };

    if (agentType) {
      query.agentType = agentType;
    }

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (sessionId) {
      query.sessionId = sessionId;
    }

    let reports = await AIReport.find(query)
      .sort({ createdAt: -1 })
      .populate("counselorId", "name");

    if (limit) {
      reports = reports.slice(0, parseInt(limit));
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching AI reports:", error);
    return NextResponse.json({ error: "Failed to fetch AI reports" }, { status: 500 });
  }
}
