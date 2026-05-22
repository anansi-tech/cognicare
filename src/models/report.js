import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    type: {
      type: String,
      enum: ["progress", "documentation", "assessment", "diagnostic", "treatment"],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "completed"],
      default: "completed",
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
reportSchema.index({ clientId: 1, createdAt: -1 });
reportSchema.index({ createdBy: 1, createdAt: -1 });

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;
