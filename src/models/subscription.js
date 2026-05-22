import mongoose from "mongoose";

const billingHistorySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["paid", "failed", "pending"], required: true },
  invoiceId: { type: String },
  paymentMethod: { type: String },
  description: { type: String },
});

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tier: { type: String, enum: ["free", "paid"], required: true },
  status: { type: String, enum: ["active", "trial", "cancelled"], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  autoRenew: { type: Boolean, default: true },
  billingHistory: [billingHistorySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

subscriptionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const Subscription =
  mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
