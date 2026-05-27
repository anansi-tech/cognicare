// One-off migration (Round 16): clients used to store `age` as a number.
// We now store `dateOfBirth` and compute age on demand. Backfill an approx
// Jan-1 DOB for any client that still has `age` but no `dateOfBirth`, then
// drop the legacy `age` field. Idempotent.
//
// Usage:  node scripts/migrate-client-dob.mjs

import mongoose from "mongoose";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not set (check .env.local).");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
const Client = mongoose.connection.collection("clients");

const now = new Date();
const year = now.getFullYear();

const cursor = Client.find({
  age: { $exists: true, $ne: null },
  $or: [{ dateOfBirth: { $exists: false } }, { dateOfBirth: null }],
});

let scanned = 0;
let migrated = 0;

for await (const c of cursor) {
  scanned++;
  const age = Number(c.age);
  if (!Number.isFinite(age) || age < 0 || age > 130) continue;
  const dob = new Date(Date.UTC(year - age, 0, 1));
  await Client.updateOne({ _id: c._id }, { $set: { dateOfBirth: dob } });
  migrated++;
}

// Drop the legacy field from every client doc (also safe if it was already gone).
const cleanup = await Client.updateMany({}, { $unset: { age: "" } });

console.log(
  `DOB backfill: scanned ${scanned}, set dateOfBirth on ${migrated}. Unset legacy 'age' on ${cleanup.modifiedCount}.`
);
await mongoose.disconnect();
