import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    // Ownership root — which practice owns this session.
    practiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Practice",
      index: true,
    },
    counselorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    type: {
      type: String,
      enum: ["initial", "followup", "assessment", "crisis", "group", "family"],
      required: true,
    },
    format: {
      type: String,
      enum: ["in-person", "video", "phone", "chat"],
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    // Raw input from counselor
    notes: {
      type: String,
      required: false,
    },
    // When the session was marked as completed by AI processing
    completedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Update timestamps before saving
sessionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Session || mongoose.model("Session", sessionSchema);
