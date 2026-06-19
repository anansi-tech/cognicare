/**
 * One-off backfill: assign null-counselorId clients to the practice owner.
 *
 * Clients created before counselorId stamping existed have no counselorId,
 * so they fall into a null bucket in the aggregation and don't appear in
 * anyone's assigned-client count on the Team page.
 *
 * Safe to re-run: only touches clients where counselorId is null/missing.
 *
 * Usage:
 *   MONGODB_URI=<uri> node scripts/backfill-counselor.mjs [--dry-run]
 */

import mongoose from "mongoose";

const isDryRun = process.argv.includes("--dry-run");
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI env var required");
  process.exit(1);
}

await mongoose.connect(uri);

const db = mongoose.connection.db;
const practices = db.collection("practices");
const clients = db.collection("clients");

const allPractices = await practices.find({}).toArray();
console.log(`Found ${allPractices.length} practice(s)`);

let totalUpdated = 0;
for (const practice of allPractices) {
  const ownerId = practice.ownerId;
  if (!ownerId) {
    console.warn(`Practice ${practice._id} has no ownerId — skipping`);
    continue;
  }

  const filter = { practiceId: practice._id, counselorId: { $in: [null, undefined] } };
  const unassigned = await clients.countDocuments(filter);

  if (unassigned === 0) {
    console.log(`Practice ${practice._id}: no unassigned clients`);
    continue;
  }

  console.log(
    `Practice ${practice._id}: ${unassigned} client(s) missing counselorId → assigning to owner ${ownerId}${isDryRun ? " (dry run)" : ""}`
  );

  if (!isDryRun) {
    const result = await clients.updateMany(filter, { $set: { counselorId: ownerId } });
    totalUpdated += result.modifiedCount;
    console.log(`  Updated ${result.modifiedCount} client(s)`);
  }
}

if (isDryRun) {
  console.log("\nDry run complete — no changes written. Re-run without --dry-run to apply.");
} else {
  console.log(`\nDone. Total clients updated: ${totalUpdated}`);
}

await mongoose.disconnect();
