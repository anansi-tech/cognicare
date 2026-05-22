import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { generateProgressReport } from "@/lib/reports/progress";
import Report from "@/models/report";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sessionId = searchParams.get("sessionId");
    const limit = searchParams.get("limit");

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    await connectDB();

    // Build query
    const query = {
      clientId,
      type: "progress",
    };

    // Add date range if provided
    if (startDate && endDate) {
      query["metadata.timestamp"] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Add session ID if provided
    if (sessionId) {
      query.sessionId = sessionId;
    }

    // Get reports
    let reports = await Report.find(query)
      .sort({ "metadata.timestamp": -1 })
      .populate("createdBy", "name");

    // Apply limit if specified
    if (limit) {
      reports = reports.slice(0, parseInt(limit));
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Error fetching progress reports:", error);
    return NextResponse.json({ error: "Failed to fetch progress reports" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, startDate, endDate, sessionId } = await request.json();

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const reportContent = await generateProgressReport(clientId, startDate, endDate, session.user);

    const report = new Report({
      clientId,
      type: "progress",
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
    console.error("Error saving progress report:", error);
    return NextResponse.json({ error: "Failed to save progress report" }, { status: 500 });
  }
}
