export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Report from "@/models/report";
import Practice from "@/models/practice";
import User from "@/models/user";
import { buildReportPdf } from "@/lib/report-pdf";

// Stream the compiled report as a PDF deliverable. Scope-checked through the
// parent client. Inline disposition by default (browsers render directly);
// callers wanting a download can append `?download=1`.
export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, reportId } = await params;
    const { searchParams } = new URL(request.url);
    const asDownload = searchParams.get("download") === "1";

    await connectDB();
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope })
      .select("name dateOfBirth gender")
      .lean();
    if (!client) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const report = await Report.findOne({
      _id: reportId,
      clientId: id,
      practiceId: user.practiceId,
    })
      .populate("createdBy", "name licenseNumber")
      .lean();
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const practice = user.practiceId
      ? await Practice.findById(user.practiceId).select("name address phone").lean()
      : null;

    // Narrative was stored as { narrative, sources } in Round 14. Fall back
    // to legacy shapes so pre-R14 reports still export.
    const narrative =
      typeof report.content === "object" && report.content !== null && !Array.isArray(report.content)
        ? report.content.narrative || ""
        : "";
    const sources = Array.isArray(report.content?.sources) ? report.content.sources : [];

    const practiceAddress =
      practice?.address
        ? [practice.address, practice.phone].filter(Boolean).join(" · ")
        : null;

    const bytes = await buildReportPdf({
      practiceName: practice?.name || "CogniCare",
      practiceAddress,
      clientName: client.name || "Unknown client",
      clientDob: client.dateOfBirth,
      clientGender: client.gender,
      reportType: report.type,
      startDate: report.startDate,
      endDate: report.endDate,
      narrative,
      clinicianName: report.createdBy?.name || "",
      clinicianLicense: report.createdBy?.licenseNumber || null,
      sourcesCount: sources.length,
      status: report.status,
      generatedAt: report.createdAt,
    });

    const filename = `${report.type}-report-${reportId}.pdf`;
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${asDownload ? "attachment" : "inline"}; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating report PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
