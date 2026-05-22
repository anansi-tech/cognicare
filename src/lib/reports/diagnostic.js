import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function generateDiagnosticReport(clientId, startDate, endDate, user) {
  try {
    await connectDB();
    console.log("Query parameters:", {
      clientId,
      startDate,
      endDate,
      startDateTime: new Date(startDate).toISOString(),
      endDateTime: new Date(endDate).toISOString(),
    });

    // Debug: Find all diagnostic reports for this client
    const allReports = await AIReport.find({
      clientId,
      type: "diagnostic",
    }).sort({ "metadata.timestamp": -1 });
    console.log(
      "All diagnostic reports for client:",
      allReports.map((r) => ({
        id: r._id,
        timestamp: r.metadata.timestamp,
        clientId: r.clientId,
      }))
    );

    // Convert dates to UTC and include the entire day
    const startDateTime = new Date(startDate);
    startDateTime.setUTCHours(0, 0, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);

    // Get all diagnostic reports from AI within the date range
    const query = {
      clientId,
      type: "diagnostic",
      "metadata.timestamp": {
        $gte: startDateTime,
        $lte: endDateTime,
      },
    };

    console.log("MongoDB query:", {
      ...query,
      "metadata.timestamp": {
        $gte: query["metadata.timestamp"].$gte.toISOString(),
        $lte: query["metadata.timestamp"].$lte.toISOString(),
      },
    });

    const diagnosticReports = await AIReport.find(query).sort({ "metadata.timestamp": -1 });

    console.log("Found reports:", diagnosticReports.length);
    if (diagnosticReports.length > 0) {
      console.log("First report metadata:", {
        timestamp: diagnosticReports[0].metadata.timestamp,
        type: diagnosticReports[0].type,
        clientId: diagnosticReports[0].clientId,
      });
    }

    if (!diagnosticReports || diagnosticReports.length === 0) {
      throw new Error("No diagnostic reports found for the specified period");
    }

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user.name,
        clientId,
        reportType: "diagnostic",
        timeRange: {
          start: startDate,
          end: endDate,
        },
        totalReports: diagnosticReports.length,
      },
      aiAnalysis: diagnosticReports.map((aiReport) => ({
        date: aiReport.metadata.timestamp,
        content: aiReport.content,
      })),
    };

    return report;
  } catch (error) {
    console.error("Error generating diagnostic report:", error);
    throw error;
  }
}
