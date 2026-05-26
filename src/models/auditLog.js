import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    practiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Practice",
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "create",
        "read",
        "update",
        "delete",
        "export",
        "import",
        "access_denied",
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: ["user", "client", "session", "invoice", "document", "report", "settings"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "unknown",
    },
    userAgent: {
      type: String,
      default: "unknown",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
