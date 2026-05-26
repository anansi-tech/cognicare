import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ConsentForm from "@/models/consentForm";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { getConsentFormTemplate } from "@/lib/templates/consentFormTemplate";
import { buildSignedConsentPdf } from "@/lib/consent-pdf";

// Type-to-sign endpoint. Token from the emailed portal link is the only
// authorization required (no user session — the client doesn't have an
// account). Generates the signed PDF server-side and stores it.
export async function POST(request) {
  try {
    const { token, typedName, agreed, guardianRelationship } = await request.json();
    if (!token || !typedName || !agreed) {
      return NextResponse.json(
        { error: "Name and agreement are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const form = await ConsentForm.findOne({
      token,
      tokenExpires: { $gt: new Date() },
      status: "pending",
    });
    if (!form) {
      return NextResponse.json(
        { error: "This consent link is invalid or has expired" },
        { status: 404 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent") || "unknown";
    const agreedAt = new Date();

    const template = getConsentFormTemplate(form.type);
    const pdfBytes = await buildSignedConsentPdf({
      title: template.title,
      body: template.content,
      version: form.version,
      typedName,
      agreedAt,
      ip,
      guardianRelationship:
        form.type === "minor" ? guardianRelationship || undefined : undefined,
    });

    const key = generateFileKey("signed-consent-forms", `${form._id}.pdf`);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const signedUrl = await uploadFile(blob, key, {
      type: "signed-consent-form",
      clientId: String(form.clientId),
      formId: String(form._id),
    });

    form.signature = { typedName, agreedAt, ipAddress: ip, userAgent: ua };
    form.signedDocumentKey = key;
    form.signedDocument = signedUrl;
    form.status = "signed";
    form.dateSigned = agreedAt;
    form.token = null;
    form.tokenExpires = null;
    await form.save();

    return NextResponse.json({
      status: "signed",
      dateSigned: agreedAt,
      formId: form._id,
    });
  } catch (error) {
    console.error("Error signing consent form:", error);
    return NextResponse.json({ error: "Failed to record signature" }, { status: 500 });
  }
}
