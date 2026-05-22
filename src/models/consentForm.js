import mongoose from "mongoose";

const consentFormSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    therapistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["treatment", "privacy", "payment", "other"],
    },
    version: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "signed", "expired", "revoked"],
      default: "pending",
    },
    // Store the file in cloud storage and keep reference here
    documentUrl: {
      type: String,
      required: true,
    },
    // Store the signed document separately
    signedDocumentUrl: {
      type: String,
    },
    // Metadata for the original document
    documentMetadata: {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      uploadedAt: Date,
    },
    // Metadata for the signed document
    signedDocumentMetadata: {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      signedAt: Date,
    },
    // Track all actions on the consent form
    history: [
      {
        action: {
          type: String,
          enum: ["created", "sent", "viewed", "signed", "revoked", "expired"],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    // Expiration and renewal settings
    expiresAt: Date,
    autoRenew: {
      type: Boolean,
      default: false,
    },
    // Additional fields
    notes: String,
    customFields: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Add indexes for common queries
consentFormSchema.index({ clientId: 1, status: 1 });
consentFormSchema.index({ therapistId: 1, status: 1 });
consentFormSchema.index({ expiresAt: 1 });

const ConsentForm = mongoose.models.ConsentForm || mongoose.model("ConsentForm", consentFormSchema);

export default ConsentForm;
