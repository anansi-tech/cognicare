import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { gatherAgentReports } from "@/lib/reports/generate";
import Report from "@/models/report";

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sessionId = searchParams.get("sessionId");
    const limit = searchParams.get("limit");

    await connectDB();

    const query = { clientId, practiceId: session.user.practiceId };
    if (type) query.type = type;
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (sessionId) query.sessionId = sessionId;

    let reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");

    if (limit) reports = reports.slice(0, parseInt(limit));

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { type, startDate, endDate, sessionId } = await request.json();

    if (!type) {
      return NextResponse.json({ error: "Report type is required" }, { status: 400 });
    }

    await connectDB();

    const reportContent = await gatherAgentReports(
      type,
      clientId,
      startDate,
      endDate,
      session.user.practiceId
    );

    const report = new Report({
      clientId,
      practiceId: session.user.practiceId,
      type,
      startDate,
      endDate,
      sessionId,
      content: reportContent,
      createdBy: session.user.id,
      status: "completed",
    });

    await report.save();

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
