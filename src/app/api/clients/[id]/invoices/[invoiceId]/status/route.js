import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope } from "@/lib/practice";
import Client from "@/models/client";
import Invoice from "@/models/invoice";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Mark an invoice paid/pending/overdue + regenerate the PDF with the new status.
// Round 12: rewritten against the Invoice model (the old `userId: user._id`
// filter was a leftover from the pre-practice schema and silently broke this
// endpoint for every user). Scope: assigned clinician or owner.
export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, invoiceId } = await params;
    const { status, paymentDate, paymentMethod } = await req.json();

    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: id, ...scope });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      clientId: client._id,
      practiceId: client.practiceId,
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const previousStatus = invoice.status;
    invoice.status = status ?? invoice.status;
    if (paymentDate) invoice.paymentDate = paymentDate;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;

    // Regenerate the PDF stamped with the new status.
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const margin = 50;
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    page.drawText("COGNICARE", {
      x: margin,
      y: pageHeight - margin - 24,
      size: 24,
      color: rgb(0.2, 0.4, 0.8),
      font: bold,
    });
    page.drawText("Professional Mental Health Services", {
      x: margin,
      y: pageHeight - margin - 44,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText("INVOICE", {
      x: margin,
      y: pageHeight - margin - 84,
      size: 20,
      color: rgb(0, 0, 0),
      font: bold,
    });
    page.drawText("Bill To:", {
      x: margin,
      y: pageHeight - margin - 114,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: bold,
    });
    page.drawText(client.name, {
      x: margin,
      y: pageHeight - margin - 134,
      size: 12,
      color: rgb(0, 0, 0),
    });
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
    page.drawText("Payment Status:", {
      x: pageWidth - margin - 200,
      y: pageHeight - margin - 164,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: bold,
    });
    page.drawText(invoice.status === "paid" ? "Paid" : "Unpaid", {
      x: pageWidth - margin - 100,
      y: pageHeight - margin - 164,
      size: 12,
      color: invoice.status === "paid" ? rgb(0, 0.5, 0) : rgb(0.8, 0.2, 0.2),
    });
    if (invoice.status === "paid" && invoice.paymentDate) {
      page.drawText(`Paid on: ${new Date(invoice.paymentDate).toLocaleDateString()}`, {
        x: pageWidth - margin - 200,
        y: pageHeight - margin - 184,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(`Payment Method: ${invoice.paymentMethod || ""}`, {
        x: pageWidth - margin - 200,
        y: pageHeight - margin - 204,
        size: 12,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    let y = pageHeight - margin - 234;
    page.drawText("Therapy Session", { x: margin, y, size: 12, color: rgb(0, 0, 0) });
    page.drawText(new Date(invoice.date).toLocaleDateString(), {
      x: margin + 200,
      y,
      size: 12,
      color: rgb(0, 0, 0),
    });
    page.drawText(`$${invoice.amount}`, { x: margin + 350, y, size: 12, color: rgb(0, 0, 0) });
    y -= 40;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 20;
    page.drawText("Total", {
      x: pageWidth - margin - 100,
      y,
      size: 12,
      color: rgb(0.3, 0.3, 0.3),
      font: bold,
    });
    page.drawText(`$${invoice.amount}`, {
      x: pageWidth - margin - 50,
      y,
      size: 12,
      color: rgb(0, 0, 0),
      font: bold,
    });

    const pdfBytes = await pdfDoc.save();
    const fileKey = generateFileKey("invoices", `${client._id}-${invoiceId}-${Date.now()}.pdf`);
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
    const pdfUrl = await uploadFile(pdfBlob, fileKey, {
      type: "invoice",
      uploadedBy: user.id,
    });

    invoice.document = pdfUrl;
    invoice.documentKey = fileKey;
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
        newStatus: invoice.status,
        paymentMethod: invoice.paymentMethod,
      },
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json({
      success: true,
      invoice: invoice.toObject(),
    });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return NextResponse.json({ error: "Failed to update invoice status" }, { status: 500 });
  }
}
