// One-off migration: lift the embedded `client.billing.invoices[]` array into
// real `Invoice` documents AND the embedded `client.consentForms[]` array
// into `ConsentForm` documents. Idempotent on both — invoice match by
// (invoiceNumber, clientId); consent match by (token | _id, clientId).
//
// Usage:  node scripts/migrate-invoices.mjs   (loads .env.local for MONGODB_URI)
//
// After running and verifying, the embedded fields are dropped from the
// client schema in a later commit (Round 12 Part 5). Re-runs are safe.

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
const ConsentForm = mongoose.connection.collection("consentforms");

// ------------------------- invoices -------------------------
const invCursor = Client.find({ "billing.invoices.0": { $exists: true } });
let invScanned = 0;
let invMigrated = 0;
let invSkipped = 0;

for await (const client of invCursor) {
  invScanned++;
  const invoices = client.billing?.invoices ?? [];
  if (!invoices.length) continue;

  for (const inv of invoices) {
    const invoiceNumber = inv.invoiceNumber || `INV-${inv._id}`;
    const exists = await Invoice.findOne({ clientId: client._id, invoiceNumber });
    if (exists) {
      invSkipped++;
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
    invMigrated++;
  }
}

console.log(
  `Invoices: clients scanned ${invScanned}, migrated ${invMigrated}, skipped ${invSkipped}.`
);

// ------------------------- consent forms -------------------------
const consentCursor = Client.find({ "consentForms.0": { $exists: true } });
let consentScanned = 0;
let consentMigrated = 0;
let consentSkipped = 0;

for await (const client of consentCursor) {
  consentScanned++;
  const forms = client.consentForms ?? [];
  if (!forms.length) continue;

  for (const f of forms) {
    // Match by token (unique per request) or by the embedded _id if no token.
    const matcher = f.token
      ? { token: f.token }
      : { clientId: client._id, documentKey: f.documentKey };
    const exists = await ConsentForm.findOne(matcher);
    if (exists) {
      consentSkipped++;
      continue;
    }
    await ConsentForm.insertOne({
      practiceId: client.practiceId,
      clientId: client._id,
      requestedBy: f.requestedBy ?? client.counselorId,
      type: f.type ?? "general",
      version: f.version ?? "1.0",
      status: f.status ?? "pending",
      document: f.document ?? "",
      documentKey: f.documentKey ?? "",
      signedDocument: f.signedDocument ?? null,
      signedDocumentKey: f.signedDocumentKey ?? null,
      token: f.token ?? null,
      tokenExpires: f.tokenExpires ?? null,
      requestedAt: f.requestedAt ?? new Date(),
      dateSigned: f.dateSigned ?? null,
      notes: f.notes ?? "",
      createdAt: f.requestedAt ?? new Date(),
      updatedAt: new Date(),
    });
    consentMigrated++;
  }
}

console.log(
  `Consent forms: clients scanned ${consentScanned}, migrated ${consentMigrated}, skipped ${consentSkipped}.`
);
await mongoose.disconnect();
