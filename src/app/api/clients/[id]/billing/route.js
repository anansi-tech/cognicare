import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Client from "@/models/client";
import { deleteFile } from "@/lib/storage";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

// Update billing information
export async function PATCH(req, context) {
  try {
    const params = await context.params;
    const { id } = params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();

    // Create billing update object
    const billingUpdate = {
      "billing.paymentMethod": body.paymentMethod || "self-pay",
      "billing.rate": body.rate || 0,
      "billing.initialRate": body.initialRate || 0,
      "billing.groupRate": body.groupRate || 0,
      "billing.notes": body.notes || "",
    };

    // If invoices are provided, update them
    if (body.invoices && Array.isArray(body.invoices)) {
      billingUpdate["billing.invoices"] = body.invoices.map((invoice) => ({
        _id: invoice._id || new mongoose.Types.ObjectId(),
        date: new Date(invoice.date),
        amount: invoice.amount,
        status: invoice.status || "pending",
        notes: invoice.notes || "",
        document: invoice.document,
        documentKey: invoice.documentKey,
      }));
    }

    const updatedClient = await Client.findOneAndUpdate(
      { _id: id, counselorId: user.id },
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

// Delete billing information
export async function DELETE(req, context) {
  try {
    const params = await context.params;
    const { id } = params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find the client and verify ownership
    const client = await Client.findOne({ _id: id, counselorId: user.id });
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    // Delete all invoice files from storage
    if (client.billing?.invoices) {
      for (const invoice of client.billing.invoices) {
        if (invoice.documentKey) {
          await deleteFile(invoice.documentKey);
        }
      }
    }

    // Remove the billing information using $unset
    const updatedClient = await Client.findOneAndUpdate(
      { _id: id, counselorId: user.id },
      { $unset: { billing: 1 } },
      { new: true }
    );

    if (!updatedClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Billing information deleted successfully" });
  } catch (error) {
    console.error("Error deleting billing:", error);
    return NextResponse.json({ message: "Error deleting billing information" }, { status: 500 });
  }
}
