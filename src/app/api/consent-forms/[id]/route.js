import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import Client from "@/models/client";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isTokenAccess = searchParams.get("token") === "true";

    let client;
    let consentForm;

    if (isTokenAccess) {
      // Token-based access (for clients)
      client = await Client.findOne({
        "consentForms.token": id,
        "consentForms.tokenExpires": { $gt: new Date() },
      });

      if (!client) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
      }

      consentForm = client.consentForms.find((form) => form.token === id);
    } else {
      // Regular access (for counselors)
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      client = await Client.findOne({
        "consentForms._id": id,
        counselorId: user._id,
      });

      if (!client) {
        return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
      }

      consentForm = client.consentForms.id(id);
    }

    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    // Return appropriate data based on access type
    if (isTokenAccess) {
      return NextResponse.json({
        _id: consentForm._id,
        type: consentForm.type,
        version: consentForm.version,
        documentUrl: consentForm.document,
        status: consentForm.status,
        dateSigned: consentForm.dateSigned,
      });
    } else {
      return NextResponse.json(consentForm);
    }
  } catch (error) {
    console.error("Error fetching consent form:", error);
    return NextResponse.json({ error: "Failed to fetch consent form" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const formData = await request.formData();
    const file = formData.get("file");
    const token = formData.get("token");

    // Find the client and consent form
    const client = await Client.findOne({
      "consentForms.token": token || id,
      "consentForms.tokenExpires": { $gt: new Date() },
      "consentForms.status": "pending",
    });

    if (!client) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
    }

    const consentForm = client.consentForms.find((form) => form.token === (token || id));

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
