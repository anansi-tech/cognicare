// AIReport: one raw output from a single AI agent run.
import mongoose from "mongoose";

const aiReportSchema = new mongoose.Schema(
  {
    clientId:    { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    practiceId:  { type: mongoose.Schema.Types.ObjectId, ref: "Practice", index: true },
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    agentType:   { type: String, required: true,
      enum: ["assessment", "diagnostic", "treatment", "progress", "documentation"] },
    summary:     { type: String, required: true },
    payload:     { type: mongoose.Schema.Types.Mixed, required: true },
    source:      { type: String, required: true }, // e.g. "agent-v2"
    modelVersion:{ type: String },                 // e.g. "gpt-5.5"
    status:      { type: String, enum: ["draft", "approved"] }, // documentation + treatment use draft/approved; others leave unset
    version:     { type: Number, default: 1 },
    supersedes:  { type: mongoose.Schema.Types.ObjectId, ref: "AIReport" },
  },
  { timestamps: true }
);

aiReportSchema.index({ clientId: 1, agentType: 1, createdAt: -1 });

export default mongoose.models.AIReport || mongoose.model("AIReport", aiReportSchema);
