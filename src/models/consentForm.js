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
    // Round 13: consent text comes from the template, so no upload is needed
    // at request time. These fields remain on signed forms (server-generated
    // signed PDF lives in signedDocument*) and on any legacy pre-R13 records.
    document: { type: String },
    documentKey: { type: String },
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
    // Legal record of the e-signature act (Round 13). Typed name + intent ("I
    // agree") + timestamp + IP/UA satisfies the US ESIGN Act for binding
    // electronic signatures.
    signature: {
      typedName: { type: String },
      agreedAt: { type: Date },
      ipAddress: { type: String },
      userAgent: { type: String },
    },
  },
  { timestamps: true }
);

consentFormSchema.index({ practiceId: 1, clientId: 1, status: 1 });
consentFormSchema.index({ token: 1 });

const ConsentForm =
  mongoose.models.ConsentForm || mongoose.model("ConsentForm", consentFormSchema);

export default ConsentForm;
