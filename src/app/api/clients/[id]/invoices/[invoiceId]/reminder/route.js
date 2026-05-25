import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import { connectDB } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email";

export async function POST(req, { params }) {
  try {
    const { id, invoiceId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope });
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
    if (invoice.status === "paid") {
      return NextResponse.json({ message: "Invoice is already paid" }, { status: 400 });
    }
    if (!client.contactInfo?.email) {
      return NextResponse.json({ message: "Client email not found" }, { status: 400 });
    }

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a202c;">Invoice Reminder</h2>
        <p>Dear ${client.name},</p>
        <p>This is a friendly reminder that you have an outstanding invoice for your therapy sessions.</p>
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Details:</strong></p>
          <p>Amount: $${invoice.amount.toFixed(2)}</p>
          <p>Date: ${new Date(invoice.date).toLocaleDateString()}</p>
          <p>Status: Pending</p>
        </div>
        ${
          invoice.paymentLink
            ? `
          <p>You can pay this invoice securely online by clicking the button below:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${invoice.paymentLink}"
               style="display: inline-block; padding: 12px 24px; background-color: #4299e1; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Pay Now
            </a>
          </div>
        `
            : ""
        }
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        <p>Thank you for your prompt attention to this matter.</p>
        <p>Best regards,<br>${user.name}</p>
      </div>
    `;

    try {
      await sendEmail({
        to: client.contactInfo.email,
        subject: `Payment Reminder: Invoice #${invoice.invoiceNumber || invoiceId}`,
        html: emailContent,
      });
    } catch {
      return NextResponse.json({ message: "Failed to send reminder email" }, { status: 500 });
    }

    invoice.lastReminderSent = new Date();
    await invoice.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending reminder:", error);
    return NextResponse.json({ message: "Error sending reminder" }, { status: 500 });
  }
}
