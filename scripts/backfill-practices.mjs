// One-off backfill for Round 8 — give existing users and their docs a practiceId.
// Idempotent: skips users and docs that already have practiceId set.
//
// Run from the cognicare/ dir:
//   node scripts/backfill-practices.mjs
//
// Requires MONGODB_URI in the environment. Reads it from .env / .env.local if dotenv
// is configured by your shell, otherwise: MONGODB_URI=... node scripts/...
import "dotenv/config";
import mongoose from "mongoose";

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set");
  process.exit(1);
}

// Minimal schemas — we don't need behavior, just the right collection names + fields.
const userSchema = new mongoose.Schema(
  {
    email: String,
    name: String,
    practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice" },
    stripeCustomerId: String,
    stripeSubscriptionStatus: String,
  },
  { collection: "users", strict: false }
);
const practiceSchema = new mongoose.Schema(
  {
    name: String,
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stripeCustomerId: String,
    stripeSubscriptionStatus: String,
    seats: { type: Number, default: 1 },
  },
  { collection: "practices", timestamps: true }
);
const ownedSchema = new mongoose.Schema(
  { counselorId: mongoose.Schema.Types.ObjectId, practiceId: mongoose.Schema.Types.ObjectId },
  { strict: false }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Practice = mongoose.models.Practice || mongoose.model("Practice", practiceSchema);
const Client = mongoose.models.Client || mongoose.model("Client", ownedSchema, "clients");
const Session = mongoose.models.Session || mongoose.model("Session", ownedSchema, "sessions");
const AIReport =
  mongoose.models.AIReport || mongoose.model("AIReport", ownedSchema, "aireports");
const Report = mongoose.models.Report || mongoose.model("Report", ownedSchema, "reports");
const MeasureAdministration =
  mongoose.models.MeasureAdministration ||
  mongoose.model(
    "MeasureAdministration",
    new mongoose.Schema(
      {
        userId: mongoose.Schema.Types.ObjectId,
        practiceId: mongoose.Schema.Types.ObjectId,
      },
      { strict: false }
    ),
    "measureadministrations"
  );

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  // 1) Users without a practiceId — create a practice-of-one, link both ways.
  const usersToBackfill = await User.find({ practiceId: { $exists: false } }).lean();
  console.log(`Users missing practiceId: ${usersToBackfill.length}`);
  const ownerToPractice = new Map(); // userId -> practiceId

  for (const u of usersToBackfill) {
    const practice = await Practice.create({
      name: `${u.name || u.email || "Counselor"}'s Practice`,
      ownerId: u._id,
      // If the user already had a Stripe shadow on their User doc (pre-Round-8),
      // carry it onto the Practice so the gate keeps allowing them.
      stripeCustomerId: u.stripeCustomerId,
      stripeSubscriptionStatus: u.stripeSubscriptionStatus,
      seats: 1,
    });
    await User.updateOne({ _id: u._id }, { $set: { practiceId: practice._id } });
    ownerToPractice.set(String(u._id), practice._id);
    console.log(`  user ${u._id} -> practice ${practice._id}`);
  }

  // Also pick up any user that already has a practiceId so we can backfill their
  // owned docs in pass 2.
  const allUsers = await User.find({ practiceId: { $exists: true } })
    .select("_id practiceId")
    .lean();
  for (const u of allUsers) {
    if (u.practiceId) ownerToPractice.set(String(u._id), u.practiceId);
  }

  // 2) Backfill owned docs by counselorId -> owner's practiceId.
  const collections = [
    { name: "clients", model: Client, ownerField: "counselorId" },
    { name: "sessions", model: Session, ownerField: "counselorId" },
    { name: "aireports", model: AIReport, ownerField: "counselorId" },
    { name: "reports", model: Report, ownerField: "createdBy" },
    { name: "measureadministrations", model: MeasureAdministration, ownerField: "userId" },
  ];

  for (const { name, model, ownerField } of collections) {
    const docs = await model.find({ practiceId: { $exists: false } }).select(`_id ${ownerField}`).lean();
    if (docs.length === 0) {
      console.log(`${name}: nothing to backfill`);
      continue;
    }
    let updated = 0;
    let skipped = 0;
    for (const d of docs) {
      const owner = d[ownerField];
      const practiceId = owner ? ownerToPractice.get(String(owner)) : null;
      if (!practiceId) {
        skipped++;
        continue;
      }
      await model.updateOne({ _id: d._id }, { $set: { practiceId } });
      updated++;
    }
    console.log(`${name}: backfilled ${updated}, skipped ${skipped} (no owner -> practice mapping)`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
