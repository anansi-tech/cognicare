import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Client from "@/models/client";
import { deleteFile } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";

export async function DELETE(req, context) {
  try {
    const { id, invoiceId } = await context.params;

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

    // Find the invoice to delete
    const invoice = client.billing?.invoices?.find((inv) => inv._id.toString() === invoiceId);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    // Try to delete the invoice file from storage if it exists
    if (invoice.documentKey) {
      try {
        await deleteFile(invoice.documentKey);
      } catch (error) {
        console.error("Error deleting invoice file:", error);
        // Continue with the deletion even if file deletion fails
      }
    }

    // Remove the invoice from the client's billing.invoices array
    const updatedClient = await Client.findOneAndUpdate(
      { _id: id, counselorId: user.id },
      { $pull: { "billing.invoices": { _id: invoiceId } } },
      { new: true }
    );

    if (!updatedClient) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ message: "Error deleting invoice" }, { status: 500 });
  }
}
