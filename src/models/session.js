import mongoose from "mongoose";
import { fieldEncryption } from "mongoose-field-encryption";
// Relative import — this model is also loaded by plain-node scripts.
import { notesHash } from "../lib/hash.js";

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
    // Content hash of `notes`, stamped on every notes write by the pre("save")
    // hook below. Aggregates and GET routes read it instead of
    // decrypt-and-recompute (compute-fallback only for pre-backfill docs).
    notesHash: { type: String },
    // Shared by sessions generated together as a recurring series (Round 15).
    // Each session is still its own doc; the seriesId only links them so we
    // can offer "cancel this and future" without modeling a separate series.
    seriesId: { type: mongoose.Schema.Types.ObjectId, index: true },
    // Reminder + cancellation metadata (Round 15).
    reminderSentAt: { type: Date },
    cancellationReason: { type: String },
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

// Update timestamps + hash-on-write before saving. Any write that changes
// notes restamps its content hash. Registered BEFORE the encryption plugin —
// its own pre("save") encrypts notes in place, and this needs the plaintext.
sessionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  if (this.isModified("notes")) this.notesHash = notesHash(this.notes ?? "");
  next();
});

sessionSchema.plugin(fieldEncryption, {
  fields: ["notes"],
  secret: process.env.PHI_ENCRYPTION_KEY,
});

export default mongoose.models.Session || mongoose.model("Session", sessionSchema);
