import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function GET(req, context) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Properly await the params
    const params = await context.params;
    const { id: clientId, sessionId } = params;

    if (!clientId || !sessionId) {
      return NextResponse.json({ error: "Client ID and Session ID are required" }, { status: 400 });
    }

    await connectDB();

    // Ensure clientId is a string
    const clientIdStr = typeof clientId === "object" ? clientId._id || clientId.id : clientId;

    // Fetch all AI reports for this session
    const reports = await AIReport.find({
      clientId: clientIdStr,
      sessionId,
    }).sort({ "metadata.timestamp": -1 });

    if (!reports || reports.length === 0) {
      return NextResponse.json({ error: "No reports found for this session" }, { status: 404 });
    }

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching session reports:", error);
    return NextResponse.json({ error: "Failed to fetch session reports" }, { status: 500 });
  }
}
