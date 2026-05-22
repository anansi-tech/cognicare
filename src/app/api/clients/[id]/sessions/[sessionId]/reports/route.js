import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";
import { getSession } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    // Check for session authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, sessionId } = await params;
    if (!id || !sessionId) {
      return NextResponse.json({ message: "Missing client or session ID" }, { status: 400 });
    }

    // Connect to the database
    await connectDB();

    // Find reports that match this client and session
    const reports = await AIReport.find({
      clientId: id,
      $or: [{ sessionId: sessionId }, { "metadata.sessionId": sessionId }],
    }).sort({ createdAt: -1 });

    if (!reports || reports.length === 0) {
      return NextResponse.json({ message: "No reports found" }, { status: 404 });
    }

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { message: "Failed to fetch reports", error: error.message },
      { status: 500 }
    );
  }
}
