import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function generateAssessmentReport(clientId, startDate, endDate, user) {
  try {
    await connectDB();
    console.log("Query parameters:", {
      clientId,
      startDate,
      endDate,
      startDateTime: new Date(startDate).toISOString(),
      endDateTime: new Date(endDate).toISOString(),
    });

    // Debug: Find all assessment reports for this client
    const allReports = await AIReport.find({
      clientId,
      type: "assessment",
    }).sort({ "metadata.timestamp": -1 });
    console.log(
      "All assessment reports for client:",
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

    // Get all assessment reports from AI within the date range
    const query = {
      clientId,
      type: "assessment",
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

    const assessmentReports = await AIReport.find(query).sort({ "metadata.timestamp": -1 });

    console.log("Found reports:", assessmentReports.length);
    if (assessmentReports.length > 0) {
      console.log("First report metadata:", {
        timestamp: assessmentReports[0].metadata.timestamp,
        type: assessmentReports[0].type,
        clientId: assessmentReports[0].clientId,
      });
    }

    if (!assessmentReports || assessmentReports.length === 0) {
      throw new Error("No assessment reports found for the specified period");
    }

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user.name,
        clientId,
        reportType: "assessment",
        timeRange: {
          start: startDate,
          end: endDate,
        },
        totalReports: assessmentReports.length,
      },
      aiAnalysis: assessmentReports.map((aiReport) => ({
        date: aiReport.metadata.timestamp,
        content: aiReport.content,
      })),
    };

    return report;
  } catch (error) {
    console.error("Error generating assessment report:", error);
    throw error;
  }
}
