import mongoose from "mongoose";

const aiReportSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    counselorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: false, // Only required for session-specific reports
    },
    type: {
      type: String,
      required: true,
      enum: [
        "assessment",
        "diagnostic",
        "treatment",
        "progress",
        "documentation",
        "conversational",
      ],
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    metadata: {
      modelVersion: String,
      timestamp: Date,
      priority: String,
      riskFactor: Boolean,
      hasProgressData: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent model recompilation error in development
const AIReport = mongoose.models.AIReport || mongoose.model("AIReport", aiReportSchema);

export default AIReport;
