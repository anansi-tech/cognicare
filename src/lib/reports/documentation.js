import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function generateDocumentationReport(clientId, startDate, endDate, user) {
  try {
    await connectDB();
    console.log("Query parameters:", {
      clientId,
      startDate,
      endDate,
      startDateTime: new Date(startDate).toISOString(),
      endDateTime: new Date(endDate).toISOString(),
    });

    // Convert dates to UTC and include the entire day
    const startDateTime = new Date(startDate);
    startDateTime.setUTCHours(0, 0, 0, 0);

    const endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);

    // Get all documentation reports from AI within the date range
    const documentationReports = await AIReport.find({
      clientId,
      type: "documentation",
      "metadata.timestamp": {
        $gte: startDateTime,
        $lte: endDateTime,
      },
    }).sort({ "metadata.timestamp": -1 });

    console.log("Found reports:", documentationReports.length);

    if (!documentationReports || documentationReports.length === 0) {
      throw new Error("No documentation reports found for the specified period");
    }

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user.name,
        clientId,
        reportType: "documentation",
        timeRange: {
          start: startDate,
          end: endDate,
        },
        totalReports: documentationReports.length,
      },
      aiAnalysis: documentationReports.map((aiReport) => ({
        date: aiReport.metadata.timestamp,
        content: aiReport.content,
      })),
    };

    return report;
  } catch (error) {
    console.error("Error generating documentation report:", error);
    throw error;
  }
}
