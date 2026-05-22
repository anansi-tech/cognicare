import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { generateDiagnosticReport } from "@/lib/reports/diagnostic";
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

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const report = await generateDiagnosticReport(clientId, startDate, endDate, session.user);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating diagnostic report:", error);
    return NextResponse.json({ error: "Failed to generate diagnostic report" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientId, startDate, endDate } = await request.json();

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const reportContent = await generateDiagnosticReport(
      clientId,
      startDate,
      endDate,
      session.user
    );

    const report = new Report({
      clientId,
      type: "diagnostic",
      startDate,
      endDate,
      content: reportContent,
      createdBy: session.user.id,
      status: "completed",
    });

    await report.save();

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Error saving diagnostic report:", error);
    return NextResponse.json({ error: "Failed to save diagnostic report" }, { status: 500 });
  }
}
