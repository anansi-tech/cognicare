import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { generateAssessmentReport } from "@/lib/reports/assessment";
import { generateDiagnosticReport } from "@/lib/reports/diagnostic";
import { generateProgressReport } from "@/lib/reports/progress";
import { generateDocumentationReport } from "@/lib/reports/documentation";
import { generateTreatmentReport } from "@/lib/reports/treatment";
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

    // Build query
    const query = {
      clientId,
    };

    // Add type if specified
    if (type) {
      query.type = type;
    }

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

    // Generate report based on type
    let reportContent;
    switch (type) {
      case "assessment":
        reportContent = await generateAssessmentReport(clientId, startDate, endDate, session.user);
        break;
      case "diagnostic":
        reportContent = await generateDiagnosticReport(clientId, startDate, endDate, session.user);
        break;
      case "progress":
        reportContent = await generateProgressReport(clientId, startDate, endDate, session.user);
        break;
      case "documentation":
        reportContent = await generateDocumentationReport(
          clientId,
          startDate,
          endDate,
          session.user
        );
        break;
      case "treatment":
        reportContent = await generateTreatmentReport(clientId, startDate, endDate, session.user);
        break;
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Create new report document
    const report = new Report({
      clientId,
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
