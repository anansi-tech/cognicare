import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteFile } from "@/lib/storage";
import Client from "@/models/client";

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, formId } = await params;

    // Find the client and remove the consent form using findOneAndUpdate
    const client = await Client.findOneAndUpdate(
      { _id: id, counselorId: user.id },
      { $pull: { consentForms: { _id: formId } } },
      { new: true }
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get the consent form to delete its file
    const consentForm = client.consentForms.find((form) => form._id.toString() === formId);
    if (consentForm?.documentKey) {
      await deleteFile(consentForm.documentKey);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting consent form:", error);
    return NextResponse.json({ error: "Failed to delete consent form" }, { status: 500 });
  }
}
