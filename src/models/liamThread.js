// LiamThread: per-(userId, clientId) conversation memory for the in-session copilot.
import mongoose from "mongoose";

const liamThreadSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    turns: [{
      role: { type: String, enum: ["user", "assistant"], required: true },
      content: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    rollingSummary: { type: String, default: "" }, // older turns, compressed
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

liamThreadSchema.index({ userId: 1, clientId: 1 }, { unique: true });

export default mongoose.models.LiamThread || mongoose.model("LiamThread", liamThreadSchema);
