// One-off migration: lift each embedded entry from `client.billing.invoices[]`
// into a real `Invoice` document. Idempotent — skips invoices already migrated
// (matched by invoiceNumber + clientId).
//
// Usage:  node scripts/migrate-invoices.mjs   (loads .env.local for MONGODB_URI)
//
// After running and verifying, the embedded array is dropped from the client
// schema in a later commit (Round 12 Part 4). Re-runs are safe.

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

// Pull collections directly so we don't depend on Next aliasing.
const Client = mongoose.connection.collection("clients");
const Invoice = mongoose.connection.collection("invoices");

const cursor = Client.find({ "billing.invoices.0": { $exists: true } });
let scanned = 0;
let migrated = 0;
let skipped = 0;

for await (const client of cursor) {
  scanned++;
  const invoices = client.billing?.invoices ?? [];
  if (!invoices.length) continue;

  for (const inv of invoices) {
    const invoiceNumber = inv.invoiceNumber || `INV-${inv._id}`;
    const exists = await Invoice.findOne({
      clientId: client._id,
      invoiceNumber,
    });
    if (exists) {
      skipped++;
      continue;
    }
    await Invoice.insertOne({
      practiceId: client.practiceId,
      clientId: client._id,
      counselorId: client.counselorId,
      invoiceNumber,
      date: inv.date ?? inv.createdAt ?? new Date(),
      amount: inv.amount ?? 0,
      status: inv.status ?? "pending",
      paymentMethod: inv.paymentMethod,
      paymentDate: inv.paymentDate ?? null,
      notes: inv.notes ?? "",
      document: inv.document ?? null,
      documentKey: inv.documentKey ?? null,
      paymentLink: inv.paymentLink ?? null,
      lastReminderSent: inv.lastReminderSent ?? null,
      lineItems: [],
      createdAt: inv.date ?? inv.createdAt ?? new Date(),
      updatedAt: new Date(),
    });
    migrated++;
  }
}

console.log(
  `Migration complete. clients scanned: ${scanned}, invoices migrated: ${migrated}, skipped (already present): ${skipped}.`
);
await mongoose.disconnect();
