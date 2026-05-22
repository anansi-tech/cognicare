import { NextResponse } from "next/server";
import { uploadFile, generateFileKey } from "@/lib/storage";
import Client from "@/models/client";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const token = formData.get("token");

    if (!file || !token) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find the client and consent form by token
    const client = await Client.findOne({
      "consentForms.token": token,
      "consentForms.tokenExpires": { $gt: new Date() },
      "consentForms.status": "pending",
    });

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

    // Update the consent form using findOneAndUpdate
    const updatedClient = await Client.findOneAndUpdate(
      {
        _id: client._id,
        "consentForms.token": token,
      },
      {
        $set: {
          "consentForms.$.signedDocument": documentUrl,
          "consentForms.$.signedDocumentKey": fileKey,
          "consentForms.$.status": "signed",
          "consentForms.$.dateSigned": new Date(),
          "consentForms.$.token": null,
          "consentForms.$.tokenExpires": null,
        },
      },
      { new: true }
    );

    if (!updatedClient) {
      return NextResponse.json({ error: "Failed to update consent form" }, { status: 500 });
    }

    const updatedForm = updatedClient.consentForms.find(
      (form) => form._id.toString() === consentForm._id.toString()
    );

    return NextResponse.json({
      _id: updatedForm._id,
      type: updatedForm.type,
      version: updatedForm.version,
      status: updatedForm.status,
      dateSigned: updatedForm.dateSigned,
      signedDocument: updatedForm.signedDocument,
      documentUrl: updatedForm.document,
    });
  } catch (error) {
    console.error("Error uploading signed form:", error);
    return NextResponse.json({ error: "Failed to upload signed form" }, { status: 500 });
  }
}
