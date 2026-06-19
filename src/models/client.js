import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  // Ownership root — which practice owns this client. Drives visibility / list
  // scoping. In a solo practice, every doc with practiceId=X is the owner's;
  // in a multi-clinician practice, all clinicians in the practice can see it.
  practiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Practice",
    index: true,
  },
  // Assigned clinician — who's working with this client. Still required.
  counselorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  // Round 16: store DOB and compute age on demand via lib/age.ageFromDob.
  dateOfBirth: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: [
      "female",
      "male",
      "non-binary",
      "transgender",
      "other",
      "prefer-not-to-say",
    ],
  },
  // Optional free-text pronouns (clinically useful in mental health).
  pronouns: { type: String, trim: true },
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
  },
  status: {
    type: String,
    enum: ["active", "inactive", "completed", "transferred"],
    default: "active",
  },
  initialAssessment: {
    type: String,
    required: true,
  },
  // Consent forms moved to the ConsentForm model in Round 12.

  // Billing Information
  billing: {
    paymentMethod: {
      type: String,
      enum: ["cash", "check", "credit", "insurance", "other"],
      default: "cash",
    },
    rate: {
      type: Number,
      default: 0,
    },
    initialRate: {
      type: Number,
      default: 0,
    },
    groupRate: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
    // Invoices moved to the Invoice model in Round 12.
  },
  // Insurance Information
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    coverage: {
      type: String,
      enum: ["full", "partial", "none"],
      default: "none",
    },
    notes: String,
  },
  // Updated whenever initialAssessment text changes; used to detect stale assessment reports.
  initialAssessmentUpdatedAt: { type: Date },
  // Set by a therapist who obtained consent in person (override for the AI gate).
  consentOverride: {
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamps before saving
clientSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Client || mongoose.model("Client", clientSchema);
