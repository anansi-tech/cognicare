import mongoose from "mongoose";
import { fieldEncryption } from "mongoose-field-encryption";

// Stanley-Brown safety plan — ONE active plan per client (upsert semantics).
// All content fields are PHI and encrypted at rest, same posture as session
// notes. The dashboard/agents may read only existence + reviewedAt (lean-safe
// metadata); contents require a hydrated read.
const safetyPlanSchema = new mongoose.Schema(
  {
    practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice", required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, unique: true },
    // Steps per the Stanley-Brown template; one entry per line.
    warningSigns: [String],
    internalCoping: [String],
    distractions: [String],
    peopleForHelp: [String],
    professionals: [String],
    environmentSafety: [String],
    reasonsForLiving: { type: String, default: "" },
    // "Reviewed today" — what session notes reference.
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

safetyPlanSchema.plugin(fieldEncryption, {
  fields: [
    "warningSigns",
    "internalCoping",
    "distractions",
    "peopleForHelp",
    "professionals",
    "environmentSafety",
    "reasonsForLiving",
  ],
  secret: process.env.PHI_ENCRYPTION_KEY,
});

export default mongoose.models.SafetyPlan || mongoose.model("SafetyPlan", safetyPlanSchema);
