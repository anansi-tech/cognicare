import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile, generateFileKey } from "@/lib/storage";
import Client from "@/models/client";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file");
    const token = formData.get("token");

    if (!file || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Try to get the current user (for counselor access)
    const user = await getCurrentUser();

    // Find the client and consent form by token
    const query = {
      "consentForms.token": token,
      "consentForms.tokenExpires": { $gt: new Date() },
      "consentForms.status": "pending",
    };

    // If user is authenticated, add counselorId to query
    if (user) {
      query.counselorId = user._id;
    }

    const client = await Client.findOne(query);

    if (!client) {
      return NextResponse.json({ error: "Consent form not found or expired" }, { status: 404 });
    }

    // Find the specific consent form
    const consentForm = client.consentForms.find((form) => form.token === token);
    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    // Upload the signed version
    const fileKey = generateFileKey("signed-consent-forms", file.name);
    const documentUrl = await uploadFile(file, fileKey, {
      type: "signed-consent-form",
      clientId: client._id,
      formId: consentForm._id,
    });

    // Update the consent form
    consentForm.signedDocument = documentUrl;
    consentForm.signedDocumentKey = fileKey;
    consentForm.status = "signed";
    consentForm.dateSigned = new Date();
    consentForm.token = null; // Invalidate the token
    consentForm.tokenExpires = null;

    await client.save();

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
