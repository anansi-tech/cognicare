// AIReport: one raw output from a single AI agent run.
import mongoose from "mongoose";
import { fieldEncryption } from "mongoose-field-encryption";
// Relative import — this model is also loaded by plain-node scripts.
import { payloadHash } from "../lib/hash.js";

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
    sourceNotesHash:      { type: String }, // assessment: intake notes; progress/documentation: their session's notes
    sourceAssessmentHash: { type: String }, // diagnostic + treatment
    sourceDiagnosticHash: { type: String }, // treatment
    // Content hash of THIS report's payload, stamped on every payload write by
    // the pre("save") hook below. Aggregates and GET routes read it instead of
    // decrypt-and-recompute (compute-fallback only for pre-backfill docs).
    payloadHash:          { type: String },
  },
  { timestamps: true }
);

aiReportSchema.index({ clientId: 1, agentType: 1, createdAt: -1 });

// Hash-on-write: any write that changes payload restamps its content hash.
// MUST be registered BEFORE the encryption plugin — its own pre("save")
// encrypts payload in place, and this hook needs the plaintext.
aiReportSchema.pre("save", function (next) {
  if (this.isModified("payload")) this.payloadHash = payloadHash(this.payload);
  next();
});

aiReportSchema.plugin(fieldEncryption, {
  fields: ["summary", "payload"],
  secret: process.env.PHI_ENCRYPTION_KEY,
});

export default mongoose.models.AIReport || mongoose.model("AIReport", aiReportSchema);
