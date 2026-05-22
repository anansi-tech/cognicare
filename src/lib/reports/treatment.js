import { connectDB } from "@/lib/mongodb";
import AIReport from "@/models/aiReport";

export async function generateTreatmentReport(clientId, startDate, endDate, user) {
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

    // Get all treatment reports from AI within the date range
    const query = {
      clientId,
      type: "treatment",
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

    const treatmentReports = await AIReport.find(query).sort({ "metadata.timestamp": -1 });

    console.log("Found reports:", treatmentReports.length);
    if (treatmentReports.length > 0) {
      console.log("First report metadata:", {
        timestamp: treatmentReports[0].metadata.timestamp,
        type: treatmentReports[0].type,
        clientId: treatmentReports[0].clientId,
      });
    }

    if (!treatmentReports || treatmentReports.length === 0) {
      throw new Error("No treatment reports found for the specified period");
    }

    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: user.name,
        clientId,
        reportType: "treatment",
        timeRange: {
          start: startDate,
          end: endDate,
        },
        totalReports: treatmentReports.length,
      },
      aiAnalysis: treatmentReports.map((aiReport) => ({
        date: aiReport.metadata.timestamp,
        content: aiReport.content,
      })),
    };

    return report;
  } catch (error) {
    console.error("Error generating treatment report:", error);
    throw error;
  }
}
