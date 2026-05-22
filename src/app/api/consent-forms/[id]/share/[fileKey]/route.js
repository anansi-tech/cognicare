import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSignedDownloadUrl } from "@/lib/storage";
import Client from "@/models/client";

export async function GET(request, { params }) {
  try {
    const { id, fileKey } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Try to get the current user (for counselor access)
    const user = await getCurrentUser();

    // Find the client and consent form by token
    const query = {
      "consentForms.token": token,
      "consentForms.tokenExpires": { $gt: new Date() },
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

    // Get the signed URL for the file
    const signedUrl = await getSignedDownloadUrl(fileKey);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Error generating share URL:", error);
    return NextResponse.json({ error: "Failed to generate share URL" }, { status: 500 });
  }
}
