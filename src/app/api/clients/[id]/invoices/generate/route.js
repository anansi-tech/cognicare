import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

export async function POST(req, context) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get client data (assignment-scoped)
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope });
    if (!client) {
      return NextResponse.json({ message: "Client not found" }, { status: 404 });
    }

    if (!client.billing?.rate) {
      return NextResponse.json({ message: "Client rate not set" }, { status: 400 });
    }

    // Get request body
    const body = await req.json();
    const { sessions = [], notes = "" } = body;

    // Calculate total amount
    let totalAmount = 0;
    for (const session of sessions) {
      // Determine the rate based on session type
      let sessionRate = client.billing.rate; // Default to standard rate
      if (session.type === "initial") {
        sessionRate = client.billing.initialRate;
      } else if (session.type === "group") {
        sessionRate = client.billing.groupRate;
      }

      const sessionAmount = sessionRate;
      totalAmount += sessionAmount;
    }

    // Generate PDF invoice
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size

    // Set margins
    const margin = 50;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

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
    const invoiceDate = new Date().toLocaleDateString();
    const timestamp = Date.now();
    const invoiceNumber = `INV-${timestamp}`;

    page.drawText(`Invoice #: ${invoiceNumber}`, {
      x: pageWidth - margin - 200,
      y: pageHeight - margin - 114,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Date: ${invoiceDate}`, {
      x: pageWidth - margin - 200,
      y: pageHeight - margin - 134,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Add payment method
    page.drawText("Payment Method:", {
      x: pageWidth - margin - 200,
      y: pageHeight - margin - 154,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });

    const paymentMethodText =
      {
        cash: "Cash",
        check: "Check",
        credit: "Credit Card",
        insurance: "Insurance",
        other: "Other",
      }[client.billing.paymentMethod] || "Not specified";

    page.drawText(paymentMethodText, {
      x: pageWidth - margin - 100,
      y: pageHeight - margin - 154,
      size: 12,
      color: rgb(0, 0, 0),
    });

    // Add payment status
    page.drawText("Payment Status:", {
      x: pageWidth - margin - 150,
      y: pageHeight - margin - 164,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    const statusText = client.billing.status === "paid" ? "Paid" : "Unpaid";
    const statusColor = client.billing.status === "paid" ? rgb(0.2, 0.8, 0.2) : rgb(0.8, 0.2, 0.2);

    page.drawText(statusText, {
      x: pageWidth - margin - 50,
      y: pageHeight - margin - 164,
      size: 12,
      color: statusColor,
    });

    // If paid, show payment method and date
    if (client.billing.status === "paid") {
      page.drawText("Payment Method:", {
        x: pageWidth - margin - 150,
        y: pageHeight - margin - 184,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
      });

      const paymentMethodText =
        client.billing.paymentMethod === "cash"
          ? "Cash"
          : client.billing.paymentMethod === "check"
            ? "Check"
            : client.billing.paymentMethod === "credit"
              ? "Card"
              : client.billing.paymentMethod === "insurance"
                ? "Insurance"
                : "Not specified";

      page.drawText(paymentMethodText, {
        x: pageWidth - margin - 50,
        y: pageHeight - margin - 184,
        size: 12,
        color: rgb(0, 0, 0),
      });

      if (client.billing.paymentDate) {
        page.drawText("Payment Date:", {
          x: pageWidth - margin - 150,
          y: pageHeight - margin - 204,
          size: 12,
          color: rgb(0.3, 0.3, 0.3),
        });

        page.drawText(new Date(client.billing.paymentDate).toLocaleDateString(), {
          x: pageWidth - margin - 50,
          y: pageHeight - margin - 204,
          size: 12,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Add sessions table header with more space
    page.drawText("Description", {
      x: margin,
      y: pageHeight - margin - 194,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText("Date", {
      x: margin + 200,
      y: pageHeight - margin - 194,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText("Amount", {
      x: margin + 350,
      y: pageHeight - margin - 194,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    // Add sessions table content
    let yPos = pageHeight - margin - 214;
    for (const session of sessions) {
      // Determine the rate based on session type
      let sessionRate = client.billing.rate; // Default to standard rate
      if (session.type === "initial") {
        sessionRate = client.billing.initialRate;
      } else if (session.type === "group") {
        sessionRate = client.billing.groupRate;
      }

      const sessionAmount = sessionRate;

      page.drawText(session.notes || "Therapy Session", {
        x: margin,
        y: yPos,
        size: 12,
        color: rgb(0, 0, 0),
      });

      page.drawText(new Date(session.date).toLocaleDateString(), {
        x: margin + 200,
        y: yPos,
        size: 12,
        color: rgb(0, 0, 0),
      });

      page.drawText(`$${sessionAmount.toFixed(2)}`, {
        x: margin + 350,
        y: yPos,
        size: 12,
        color: rgb(0, 0, 0),
      });

      yPos -= 20;
    }

    // Add total
    yPos -= 20;
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: pageWidth - margin, y: yPos },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    yPos -= 20;
    page.drawText("Total", {
      x: pageWidth - margin - 100,
      y: yPos,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    page.drawText(`$${totalAmount.toFixed(2)}`, {
      x: pageWidth - margin - 50,
      y: yPos,
      size: 12,
      color: rgb(0, 0, 0),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    // Add payment instructions before footer
    yPos = margin + 100;
    page.drawText("Payment Instructions:", {
      x: margin,
      y: yPos,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    yPos -= 20;
    page.drawText(`Please make payment via ${client.billing.paymentMethod}`, {
      x: margin,
      y: yPos,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPos -= 15;
    page.drawText("Payment is due within 30 days of invoice date", {
      x: margin,
      y: yPos,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Add footer with more spacing
    yPos = margin + 30;
    page.drawText("Thank you for your business!", {
      x: margin,
      y: yPos,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    });

    yPos -= 20;
    page.drawText("COGNICARE", {
      x: margin,
      y: yPos,
      size: 11,
      color: rgb(0.4, 0.4, 0.4),
    });

    yPos -= 15;
    page.drawText("Professional Mental Health Services", {
      x: margin,
      y: yPos,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPos -= 12;
    page.drawText("123 Therapy Lane, Suite 100", {
      x: margin,
      y: yPos,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPos -= 10;
    page.drawText("Anytown, ST 12345", {
      x: margin,
      y: yPos,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPos -= 10;
    page.drawText("Phone: (555) 123-4567 | Email: info@cognicare.com", {
      x: margin,
      y: yPos,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    // Convert PDF bytes to Blob
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

    // Generate file key
    const fileKey = generateFileKey("invoices", `invoice-${Date.now()}.pdf`);

    // Upload PDF to storage
    const documentUrl = await uploadFile(pdfBlob, fileKey, {
      type: "invoice",
      uploadedBy: user._id,
    });

    // Create the Invoice doc (first-class model since Round 12).
    const lineItems = sessions.map((s) => {
      const rate =
        s.type === "initial"
          ? client.billing.initialRate || client.billing.rate
          : s.type === "group"
            ? client.billing.groupRate || client.billing.rate
            : client.billing.rate;
      return {
        sessionId: s._id,
        description: s.notes || `${s.type || "standard"} session`,
        amount: rate,
      };
    });

    const invoice = await Invoice.create({
      practiceId: client.practiceId,
      clientId: client._id,
      counselorId: client.counselorId,
      invoiceNumber: `INV-${timestamp}`,
      date: new Date(),
      amount: totalAmount,
      status: "pending",
      paymentMethod: client.billing.paymentMethod || "cash",
      notes: notes || "",
      document: documentUrl,
      documentKey: fileKey,
      lineItems,
    });

    // Generate payment link only if payment method is credit
    if (client.billing.paymentMethod === "credit") {
      try {
        const paymentLinkResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/create-payment-link`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.get("cookie"),
            },
            body: JSON.stringify({
              clientId: id,
              invoiceId: invoice._id,
              amount: totalAmount,
              description: `Invoice ${invoice.invoiceNumber} for ${client.name}`,
            }),
          }
        );
        if (paymentLinkResponse.ok) {
          const { paymentLink } = await paymentLinkResponse.json();
          invoice.paymentLink = paymentLink;
          await invoice.save();
        } else {
          const err = await paymentLinkResponse.json();
          console.error("Payment link generation failed:", err);
        }
      } catch (error) {
        console.error("Error generating payment link:", error);
      }
    }

    await logAuditEvent({
      userId: user.id,
      practiceId: client.practiceId,
      action: AuditActions.CREATE,
      entityType: EntityTypes.INVOICE,
      entityId: invoice._id,
      details: { clientId: client._id, amount: totalAmount, invoiceNumber: invoice.invoiceNumber },
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json({
      success: true,
      invoice: invoice.toObject(),
      documentUrl,
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json({ message: "Error generating invoice" }, { status: 500 });
  }
}
