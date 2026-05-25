import { NextResponse } from "next/server";
import { getSignedDownloadUrl } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";
import ConsentForm from "@/models/consentForm";

// Generates a short-lived signed download URL for a consent doc. Requires
// the consent-form token (proves the caller is the intended recipient or has
// the share link). The fileKey is taken from the form's stored documentKey
// or signedDocumentKey — we don't trust arbitrary keys.
export async function GET(request, { params }) {
  try {
    const { id, fileKey } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    await connectDB();
    const consentForm = await ConsentForm.findOne({
      _id: id,
      token,
      tokenExpires: { $gt: new Date() },
    }).lean();
    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found or expired" }, { status: 404 });
    }

    if (consentForm.documentKey !== fileKey && consentForm.signedDocumentKey !== fileKey) {
      return NextResponse.json({ error: "File key does not match this consent form" }, { status: 403 });
    }

    const signedUrl = await getSignedDownloadUrl(fileKey);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Error generating share URL:", error);
    return NextResponse.json({ error: "Failed to generate share URL" }, { status: 500 });
  }
}
