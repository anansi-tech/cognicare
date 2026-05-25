import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import { deleteFile } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";

// GET: return the client's billing reference info AND their invoices from
// the Invoice model (the embedded `client.billing.invoices[]` array is on
// its way out — Part 4 of Round 12 drops it).
export async function GET(_req, context) {
  try {
    const params = await context.params;
    const { id } = params;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope })
      .select("billing practiceId")
      .lean();
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const invoices = await Invoice.find({ clientId: id, practiceId: client.practiceId })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ billing: client.billing ?? null, invoices });
  } catch (error) {
    console.error("Error fetching billing:", error);
    return NextResponse.json({ message: "Error fetching billing" }, { status: 500 });
  }
}

// PATCH: update billing reference info (rate, payment method, notes).
// Invoices are no longer part of this payload; they're managed through
// /api/clients/[id]/invoices/* (Round 12).
export async function PATCH(req, context) {
  try {
    const params = await context.params;
    const { id } = params;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();

    const billingUpdate = {
      "billing.paymentMethod": body.paymentMethod || "cash",
      "billing.rate": body.rate || 0,
      "billing.initialRate": body.initialRate || 0,
      "billing.groupRate": body.groupRate || 0,
      "billing.notes": body.notes || "",
    };

    const scope = await clientScope(user);
    const updatedClient = await Client.findOneAndUpdate(
      { _id: id, ...scope },
      { $set: billingUpdate },
      { new: true }
    );

    if (!updatedClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }
    return NextResponse.json(updatedClient.billing);
  } catch (error) {
    console.error("Error updating billing:", error);
    return NextResponse.json({ message: "Error updating billing information" }, { status: 500 });
  }
}

// DELETE: clear the billing reference block on the client. Also deletes any
// stored invoice files + the Invoice docs for cleanup.
export async function DELETE(_req, context) {
  try {
    const params = await context.params;
    const { id } = params;

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope });
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const invoices = await Invoice.find({ clientId: id, practiceId: client.practiceId });
    for (const inv of invoices) {
      if (inv.documentKey) {
        try {
          await deleteFile(inv.documentKey);
        } catch (e) {
          console.error("Error deleting invoice file:", e);
        }
      }
    }
    await Invoice.deleteMany({ clientId: id, practiceId: client.practiceId });

    await Client.updateOne({ _id: id, ...scope }, { $unset: { billing: 1 } });

    return NextResponse.json({ message: "Billing information deleted successfully" });
  } catch (error) {
    console.error("Error deleting billing:", error);
    return NextResponse.json({ message: "Error deleting billing information" }, { status: 500 });
  }
}
