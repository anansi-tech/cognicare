import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema(
  {
    practiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Practice",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Random opaque token. Indexed (unique) so the public lookup is fast.
    token: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "revoked"],
      default: "pending",
    },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Invitation ||
  mongoose.model("Invitation", invitationSchema);
