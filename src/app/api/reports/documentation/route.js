import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { generateDocumentationReport } from "@/lib/reports/documentation";
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
      type: "documentation",
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
    console.error("Error fetching documentation reports:", error);
    return NextResponse.json({ error: "Failed to fetch documentation reports" }, { status: 500 });
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

    const reportContent = await generateDocumentationReport(
      clientId,
      startDate,
      endDate,
      session.user
    );

    const report = new Report({
      clientId,
      type: "documentation",
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
    console.error("Error saving documentation report:", error);
    return NextResponse.json({ error: "Failed to save documentation report" }, { status: 500 });
  }
}
