import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function generateProgressReport(clientId, startDate, endDate, user) {
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

    // Get all progress reports from AI within the date range
    const progressReports = await AIReport.find({
      clientId,
      type: "progress",
      "metadata.timestamp": {
        $gte: startDateTime,
        $lte: endDateTime,
      },
    }).sort({ "metadata.timestamp": -1 });

    console.log("Found reports:", progressReports.length);

    if (!progressReports || progressReports.length === 0) {
      throw new Error("No progress reports found for the specified period");
    }

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user.name,
        clientId,
        reportType: "progress",
        timeRange: {
          start: startDate,
          end: endDate,
        },
        totalReports: progressReports.length,
      },
      aiAnalysis: progressReports.map((aiReport) => ({
        date: aiReport.metadata.timestamp,
        content: aiReport.content,
      })),
    };

    return report;
  } catch (error) {
    console.error("Error generating progress report:", error);
    throw error;
  }
}
