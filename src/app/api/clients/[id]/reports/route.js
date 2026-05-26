import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import { gatherAgentReports } from "@/lib/reports/generate";
import { synthesizeReport } from "@/lib/ai/agents/report";
import Client from "@/models/client";
import Report from "@/models/report";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sessionId = searchParams.get("sessionId");
    const limit = searchParams.get("limit");

    await connectDB();

    // Inherit visibility from the parent client (Round 10 / Round 14).
    const scope = await clientScope(user);
    const visible = await Client.findOne({ _id: clientId, ...scope }).select("_id").lean();
    if (!visible) {
      return NextResponse.json({ reports: [] });
    }

    const query = { clientId, practiceId: user.practiceId };
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
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: clientId } = await params;
    const { type, startDate, endDate, sessionId } = await request.json();

    if (!type) {
      return NextResponse.json({ error: "Report type is required" }, { status: 400 });
    }
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Scope: a clinician can only compile reports for clients they can see.
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: clientId, ...scope });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const sources = await gatherAgentReports(
      type,
      clientId,
      startDate,
      endDate,
      user.practiceId
    );

    // Don't synthesize from nothing — clear error so the UI can prompt the
    // clinician to widen the range or pick a different type.
    if (!sources || sources.length === 0) {
      return NextResponse.json(
        {
          error:
            "No clinical records in this period to compile. Widen the date range or pick a different report type.",
        },
        { status: 400 }
      );
    }

    let narrative = "";
    try {
      narrative = await synthesizeReport({
        reportType: type,
        client,
        agentReports: sources,
        from: startDate,
        to: endDate,
      });
    } catch (e) {
      console.error("Synthesis failed:", e);
      return NextResponse.json(
        { error: "Failed to synthesize the report. Please retry." },
        { status: 502 }
      );
    }

    // Store the prose alongside source pointers for traceability.
    const sourceRefs = sources.map((s) => ({
      id: s._id,
      agentType: s.agentType,
      summary: s.summary,
      createdAt: s.createdAt,
    }));

    const report = new Report({
      clientId,
      practiceId: user.practiceId,
      type,
      startDate,
      endDate,
      sessionId,
      content: { narrative, sources: sourceRefs },
      createdBy: user.id,
      // AI-generated → draft until the clinician reviews/approves.
      status: "draft",
    });

    await report.save();

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.CREATE,
      entityType: EntityTypes.REPORT,
      entityId: report._id,
      details: { clientId, type, startDate, endDate, sources: sourceRefs.length },
      ...auditMetaFromRequest(request),
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
