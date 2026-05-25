import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Stripe payment redirect lands here. Marks the invoice paid directly
// (Round 12: previously fan-out fetched /status which is now redundant).
// Scope-checked; audited.
export async function GET(request, { params }) {
  try {
    const { id, invoiceId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope }).select("_id practiceId").lean();
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      clientId: client._id,
      practiceId: client.practiceId,
    });
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status !== "paid") {
      const previousStatus = invoice.status;
      invoice.status = "paid";
      invoice.paymentDate = new Date();
      invoice.paymentMethod = invoice.paymentMethod || "credit";
      await invoice.save();

      await logAuditEvent({
        userId: user.id,
        practiceId: invoice.practiceId,
        action: AuditActions.UPDATE,
        entityType: EntityTypes.INVOICE,
        entityId: invoice._id,
        details: {
          clientId: invoice.clientId,
          previousStatus,
          newStatus: "paid",
          via: "stripe-redirect",
        },
        ...auditMetaFromRequest(request),
      });
    }

    return NextResponse.json({ invoice: invoice.toObject() });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { message: error.message || "Error verifying payment" },
      { status: 500 }
    );
  }
}
