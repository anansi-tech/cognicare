import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import { deleteFile } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Resolves an invoice only if the caller can see its client. Returns the
// invoice doc (or null) — saves duplicating the scope check in every handler.
async function resolveInvoice({ clientId, invoiceId, user }) {
  const scope = await clientScope(user);
  const client = await Client.findOne({ _id: clientId, ...scope }).select("_id practiceId").lean();
  if (!client) return null;
  return Invoice.findOne({ _id: invoiceId, clientId: client._id, practiceId: client.practiceId });
}

export async function GET(_req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id, invoiceId } = await params;
  const invoice = await resolveInvoice({ clientId: id, invoiceId, user });
  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }
  return NextResponse.json(invoice.toObject());
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id, invoiceId } = await params;

  const invoice = await resolveInvoice({ clientId: id, invoiceId, user });
  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }

  if (invoice.documentKey) {
    try {
      await deleteFile(invoice.documentKey);
    } catch (e) {
      console.error("Error deleting invoice file:", e);
      // Proceed; the doc remains the source of truth.
    }
  }

  await invoice.deleteOne();

  await logAuditEvent({
    userId: user.id,
    practiceId: invoice.practiceId,
    action: AuditActions.DELETE,
    entityType: EntityTypes.INVOICE,
    entityId: invoice._id,
    details: { clientId: invoice.clientId, invoiceNumber: invoice.invoiceNumber },
    ...auditMetaFromRequest(req),
  });

  return NextResponse.json({ message: "Invoice deleted successfully" });
}
