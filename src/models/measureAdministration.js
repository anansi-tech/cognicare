import mongoose from "mongoose";

const measureAdministrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice", index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    instrumentId: { type: String, required: true }, // e.g. "phq9"
    responses: [{ itemId: String, value: Number }],
    total: { type: Number, required: true },
    severityBand: { type: String, required: true },
    flags: [{ flag: String, itemId: String, note: String }],
    isBaseline: { type: Boolean, default: false },
    administeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

measureAdministrationSchema.index({ clientId: 1, instrumentId: 1, administeredAt: -1 });

export default mongoose.models.MeasureAdministration ||
  mongoose.model("MeasureAdministration", measureAdministrationSchema);
