// Practice: the organization that owns clients/sessions/reports and holds the subscription.
// A solo counselor is a practice of one. Team membership/roles arrive with Auth.js v5.
import mongoose from "mongoose";

const practiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Jane Doe Counseling" or a group name
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Subscription lives at the practice level (the practice pays).
    stripeCustomerId: { type: String },
    stripeSubscriptionStatus: { type: String }, // trialing|active|past_due|canceled|...
    seats: { type: Number, default: 1 }, // paid clinician seats (enforced later, with Auth.js v5)
  },
  { timestamps: true }
);

export default mongoose.models.Practice || mongoose.model("Practice", practiceSchema);
