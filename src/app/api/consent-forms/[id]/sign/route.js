import { NextResponse } from "next/server";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";
import ConsentForm from "@/models/consentForm";

// Alternate signing path keyed by ConsentForm id; the form's `token` must be
// passed in the body to authorize the sign (matches the canonical /sign route
// — same semantics, kept for backward-compat with any client UIs hitting it).
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    const token = formData.get("token");
    if (!file || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const consentForm = await ConsentForm.findOne({
      _id: id,
      token,
      tokenExpires: { $gt: new Date() },
      status: "pending",
    });
    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found or expired" }, { status: 404 });
    }

    const fileKey = generateFileKey("signed-consent-forms", file.name);
    const documentUrl = await uploadFile(file, fileKey, {
      type: "signed-consent-form",
      clientId: String(consentForm.clientId),
      formId: String(consentForm._id),
    });

    consentForm.signedDocument = documentUrl;
    consentForm.signedDocumentKey = fileKey;
    consentForm.status = "signed";
    consentForm.dateSigned = new Date();
    consentForm.token = null;
    consentForm.tokenExpires = null;
    await consentForm.save();

    return NextResponse.json({
      _id: consentForm._id,
      type: consentForm.type,
      version: consentForm.version,
      status: consentForm.status,
      dateSigned: consentForm.dateSigned,
    });
  } catch (error) {
    console.error("Error uploading signed form:", error);
    return NextResponse.json({ error: "Failed to upload signed form" }, { status: 500 });
  }
}
