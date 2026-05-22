import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Client from "@/models/client";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, invoiceId } = await params;
    const { status, paymentDate, paymentMethod } = await req.json();

    // Find the client and update the invoice
    const client = await Client.findOne({ _id: id, userId: user._id });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const invoice = client.billing.invoices.id(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Update invoice status and date
    invoice.status = status;
    if (paymentDate) {
      invoice.paymentDate = paymentDate;
    }
    if (paymentMethod) {
      invoice.paymentMethod = paymentMethod;
    }

    // Regenerate PDF with updated status
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const margin = 50;

    // Add company letterhead
    page.drawText("COGNICARE", {
      x: margin,
      y: pageHeight - margin - 24,
      size: 24,
      color: rgb(0.2, 0.4, 0.8),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText("Professional Mental Health Services", {
      x: margin,
      y: pageHeight - margin - 44,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Add invoice header
    page.drawText("INVOICE", {
      x: margin,
      y: pageHeight - margin - 84,
      size: 20,
      color: rgb(0, 0, 0),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    // Add client information section
    page.drawText("Bill To:", {
      x: margin,
      y: pageHeight - margin - 114,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText(`${client.name}`, {
      x: margin,
      y: pageHeight - margin - 134,
      size: 12,
      color: rgb(0, 0, 0),
    });

    // Add invoice details
    page.drawText(`Invoice #: ${invoice.invoiceNumber}`, {
      x: pageWidth - margin - 200,
      y: pageHeight - margin - 114,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, {
      x: pageWidth - margin - 200,
      y: pageHeight - margin - 134,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Add payment status
    page.drawText("Payment Status:", {
      x: pageWidth - margin - 200,
      y: pageHeight - margin - 164,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText(status === "paid" ? "Paid" : "Unpaid", {
      x: pageWidth - margin - 100,
      y: pageHeight - margin - 164,
      size: 12,
      color: status === "paid" ? rgb(0, 0.5, 0) : rgb(0.8, 0.2, 0.2),
    });

    if (status === "paid") {
      page.drawText(`Paid on: ${new Date(paymentDate).toLocaleDateString()}`, {
        x: pageWidth - margin - 200,
        y: pageHeight - margin - 184,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(`Payment Method: ${paymentMethod}`, {
        x: pageWidth - margin - 200,
        y: pageHeight - margin - 204,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // Add sessions table header with more space
    page.drawText("Description", {
      x: margin,
      y: pageHeight - margin - 214,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText("Date", {
      x: margin + 200,
      y: pageHeight - margin - 214,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText("Amount", {
      x: margin + 350,
      y: pageHeight - margin - 214,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    // Add sessions table content
    let yPosition = pageHeight - margin - 234;

    // Add session details
    page.drawText(`Therapy Session`, {
      x: margin,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });

    page.drawText(new Date(invoice.date).toLocaleDateString(), {
      x: margin + 200,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });

    page.drawText(`$${invoice.amount}`, {
      x: margin + 350,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;

    // Add total
    yPosition -= 20;
    page.drawLine({
      start: { x: margin, y: yPosition },
      end: { x: pageWidth - margin, y: yPosition },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    yPosition -= 20;
    page.drawText("Total", {
      x: pageWidth - margin - 100,
      y: yPosition,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText(`$${invoice.amount}`, {
      x: pageWidth - margin - 50,
      y: yPosition,
      size: 12,
      color: rgb(0, 0, 0),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    // Add payment instructions before footer
    yPosition = margin + 100;
    page.drawText("Payment Instructions:", {
      x: margin,
      y: yPosition,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    yPosition -= 20;
    page.drawText(`Please make payment via ${client.billing.paymentMethod}`, {
      x: margin,
      y: yPosition,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 15;
    page.drawText("Payment is due within 30 days of invoice date", {
      x: margin,
      y: yPosition,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Add footer with more spacing
    yPosition = margin + 30;
    page.drawText("Thank you for your business!", {
      x: margin,
      y: yPosition,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    yPosition -= 20;
    page.drawText("COGNICARE", {
      x: margin,
      y: yPosition,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPosition -= 15;
    page.drawText("Professional Mental Health Services", {
      x: margin,
      y: yPosition,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPosition -= 12;
    page.drawText("123 Therapy Lane, Suite 100", {
      x: margin,
      y: yPosition,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPosition -= 10;
    page.drawText("Anytown, ST 12345", {
      x: margin,
      y: yPosition,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPosition -= 10;
    page.drawText("Phone: (555) 123-4567 | Email: info@cognicare.com", {
      x: margin,
      y: yPosition,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Save and upload the new PDF
    const pdfBytes = await pdfDoc.save();
    const fileKey = generateFileKey("invoices", `${client._id}-${invoiceId}-${Date.now()}.pdf`);

    // Create a Blob from the PDF bytes
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    const pdfUrl = await uploadFile(pdfBlob, fileKey, {
      type: "invoice",
      uploadedBy: user._id,
    });

    // Update invoice with new PDF and status
    const updatedClient = await Client.findOneAndUpdate(
      {
        _id: id,
        userId: user._id,
        "billing.invoices._id": invoiceId,
      },
      {
        $set: {
          "billing.invoices.$.document": pdfUrl,
          "billing.invoices.$.documentKey": fileKey,
          "billing.invoices.$.status": status,
          "billing.invoices.$.paymentDate": paymentDate,
          "billing.invoices.$.paymentMethod": paymentMethod,
          "billing.invoices.$.invoiceNumber": invoice.invoiceNumber,
        },
      },
      { new: true }
    );

    if (!updatedClient) {
      return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
    }

    // Find the updated invoice
    const updatedInvoice = updatedClient.billing.invoices.id(invoiceId);

    return NextResponse.json({
      success: true,
      invoice: {
        _id: updatedInvoice._id.toString(),
        date: updatedInvoice.date,
        amount: updatedInvoice.amount,
        status: updatedInvoice.status,
        paymentDate: updatedInvoice.paymentDate,
        notes: updatedInvoice.notes,
        document: pdfUrl,
        documentKey: updatedInvoice.documentKey,
        invoiceNumber: invoice.invoiceNumber,
      },
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return NextResponse.json({ error: "Failed to update invoice status" }, { status: 500 });
  }
}
