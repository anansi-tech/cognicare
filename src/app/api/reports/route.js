import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Report from "@/models/report";
import { requireAuth, getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";

// Get all reports for the authenticated counselor
export const GET = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Reports inherit visibility from their parent client.
    const allowedClientIds = await visibleClientIds(user);
    const query = {
      practiceId: user.practiceId,
      clientId: clientId
        ? allowedClientIds.some((id) => id.toString() === clientId)
          ? clientId
          : { $in: [] }
        : { $in: allowedClientIds },
    };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const reports = await Report.find(query)
      .populate("clientId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json({ message: "Error fetching reports" }, { status: 500 });
  }
});

// Create a new report. Scope-guarded — a clinician can only create reports
// for clients they can see (mirrors the per-client POST). Most callers now
// use /api/clients/[id]/reports (Round 14); this endpoint is kept for
// completeness of the global API surface.
export const POST = requireAuth(async (req) => {
  try {
    await connectDB();
    const user = await getCurrentUser();

    const body = await req.json();
    const newReport = {
      ...body,
      practiceId: user.practiceId,
      createdBy: user.id,
      createdAt: new Date(),
    };

    const requiredFields = ["clientId", "type", "content"];
    for (const field of requiredFields) {
      if (!newReport[field]) {
        return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const allowed = await visibleClientIds(user);
    if (!allowed.some((id) => id.toString() === String(newReport.clientId))) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const createdReport = await Report.create(newReport);

    const populatedReport = await Report.findById(createdReport._id)
      .populate("clientId", "name")
      .populate("sessionId", "date type")
      .lean();

    return NextResponse.json(populatedReport, { status: 201 });
  } catch (error) {
    console.error("Report POST error:", error);
    return NextResponse.json({ message: "Error creating report" }, { status: 500 });
  }
});
