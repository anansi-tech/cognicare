import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Client from "@/models/client";
import { connectDB } from "@/lib/mongodb";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req, context) {
  try {
    const { id, invoiceId } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Find the client and invoice
    const client = await Client.findOne({ _id: id, counselorId: user.id });
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    const invoice = client.billing.invoices.id(invoiceId);
    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ message: "Invoice is already paid" }, { status: 400 });
    }

    if (!client.contactInfo.email) {
      return NextResponse.json({ message: "Client email not found" }, { status: 400 });
    }

    // Send reminder email
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

    const { data, error } = await resend.emails.send({
      from: "Cognicare <onboarding@resend.dev>",
      to: client.contactInfo.email,
      subject: `Payment Reminder: Invoice #${invoice.invoiceNumber || invoiceId}`,
      html: emailContent,
    });

    if (error) {
      console.error("Error sending reminder email:", error);
      return NextResponse.json({ message: "Failed to send reminder email" }, { status: 500 });
    }

    // Update last reminder sent date
    invoice.lastReminderSent = new Date();
    await client.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending reminder:", error);
    return NextResponse.json({ message: "Error sending reminder" }, { status: 500 });
  }
}
