// Invoice — first-class patient-billing record. Promoted out of the embedded
// `client.billing.invoices[]` array in Round 12 so we can scope-audit them
// consistently and query across clients (unpaid this month, revenue, etc.).
// Simple invoicing: client + sessions + amount + status. No insurance claims.
import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    practiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Practice",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    invoiceNumber: { type: String, required: true },
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "check", "credit", "insurance", "other"],
    },
    paymentDate: { type: Date },
    notes: { type: String },
    document: { type: String },
    documentKey: { type: String },
    paymentLink: { type: String },
    lastReminderSent: { type: Date },
    lineItems: [
      {
        sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
        description: String,
        amount: Number,
      },
    ],
  },
  { timestamps: true }
);

invoiceSchema.index({ practiceId: 1, status: 1, date: -1 });
invoiceSchema.index({ clientId: 1, date: -1 });

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);
