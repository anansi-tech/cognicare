// AIReport: one raw output from a single AI agent run.
import mongoose from "mongoose";
import { fieldEncryption } from "mongoose-field-encryption";

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
    // Set only when a human edits the payload — approving without editing bumps
    // `updatedAt` but not this. Metadata only; staleness is hash-based (R54).
    editedAt:    { type: Date },
    // Content hashes (src/lib/hash.js) of the tracked direct upstreams,
    // captured when this artifact was generated or last manually reconciled.
    // Staleness = current upstream hash ≠ stored hash. HMAC output — no
    // plaintext PHI — so plain unencrypted Strings.
    sourceNotesHash:      { type: String }, // assessment: intake notes
    sourceAssessmentHash: { type: String }, // diagnostic + treatment
    sourceDiagnosticHash: { type: String }, // treatment
  },
  { timestamps: true }
);

aiReportSchema.index({ clientId: 1, agentType: 1, createdAt: -1 });

aiReportSchema.plugin(fieldEncryption, {
  fields: ["summary", "payload"],
  secret: process.env.PHI_ENCRYPTION_KEY,
});

export default mongoose.models.AIReport || mongoose.model("AIReport", aiReportSchema);
