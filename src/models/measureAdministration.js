import mongoose from "mongoose";
import { fieldEncryption } from "mongoose-field-encryption";

const measureAdministrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice", index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    instrumentId: { type: String, required: true }, // e.g. "phq9"
    responses: [{ itemId: String, value: Number }],
    total: { type: Number }, // null for categorical instruments (C-SSRS)
    severityBand: { type: String, required: true },
    // Categorical risk tier — deliberately unencrypted metadata so the
    // dashboard can read it lean (a tier label without item content, same
    // posture as the hash-on-write precedent). Item-level responses/flags
    // stay encrypted.
    tier: { type: String, enum: ["none", "low", "moderate", "high"] },
    flags: [{ flag: String, itemId: String, note: String }],
    isBaseline: { type: Boolean, default: false },
    administeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

measureAdministrationSchema.index({ clientId: 1, instrumentId: 1, administeredAt: -1 });

measureAdministrationSchema.plugin(fieldEncryption, {
  fields: ["responses", "flags"],
  secret: process.env.PHI_ENCRYPTION_KEY,
});

export default mongoose.models.MeasureAdministration ||
  mongoose.model("MeasureAdministration", measureAdministrationSchema);
