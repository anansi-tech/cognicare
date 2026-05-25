import mongoose from "mongoose";

// Single source of truth for consent forms (Round 12). Replaces the embedded
// `client.consentForms[]` array that was running in parallel — the embedded
// path is being retired in Part 5. Type enum matches the templates in
// lib/templates/consentFormTemplate.js (general/telehealth/minor).
const consentFormSchema = new mongoose.Schema(
  {
    practiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Practice",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["general", "telehealth", "minor"],
    },
    version: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "signed", "expired", "revoked"],
      default: "pending",
    },
    // Original document (the request the counselor sent)
    document: { type: String, required: true },
    documentKey: { type: String, required: true },
    // Client's countersigned upload
    signedDocument: { type: String },
    signedDocumentKey: { type: String },
    // Token-based portal access for the client to sign without an account
    token: { type: String, index: true },
    tokenExpires: { type: Date },
    requestedAt: { type: Date, default: Date.now },
    dateSigned: { type: Date },
    expiresAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

consentFormSchema.index({ practiceId: 1, clientId: 1, status: 1 });
consentFormSchema.index({ token: 1 });

const ConsentForm =
  mongoose.models.ConsentForm || mongoose.model("ConsentForm", consentFormSchema);

export default ConsentForm;
