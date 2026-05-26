import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { deleteFile } from "@/lib/storage";
import { connectDB } from "@/lib/mongodb";
import ConsentForm from "@/models/consentForm";
import { getConsentFormTemplate } from "@/lib/templates/consentFormTemplate";

// Fetch a single consent form. Two access paths:
//   - ?token=true  → public, by token (client portal flow, no auth required)
//   - default      → counselor access, scope-checked against client visibility
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isTokenAccess = searchParams.get("token") === "true";

    if (isTokenAccess) {
      // For the public portal we accept either a still-valid pending token
      // OR a signed form whose token has been cleared — so the signer can
      // revisit the link and see signed-state + download.
      const consentForm =
        (await ConsentForm.findOne({
          token: id,
          tokenExpires: { $gt: new Date() },
        }).lean()) ||
        (await ConsentForm.findOne({ status: "signed", _id: id }).lean());
      if (!consentForm) {
        return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
      }
      // Return enough for in-browser type-to-sign: the consent body text +
      // signed-state metadata. Never expose PHI here (client name etc.).
      let body = "";
      let title = "";
      try {
        const template = getConsentFormTemplate(consentForm.type);
        body = template?.content || "";
        title = template?.title || "";
      } catch {
        // unknown type — fall back gracefully
      }
      return NextResponse.json({
        _id: consentForm._id,
        type: consentForm.type,
        title,
        body,
        version: consentForm.version,
        documentUrl: consentForm.document,
        signedDocumentUrl: consentForm.signedDocument || null,
        status: consentForm.status,
        dateSigned: consentForm.dateSigned,
      });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const consentForm = await ConsentForm.findOne({
      _id: id,
      practiceId: user.practiceId,
    }).lean();
    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    const allowed = await visibleClientIds(user);
    if (!allowed.some((cid) => cid.toString() === consentForm.clientId.toString())) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    return NextResponse.json(consentForm);
  } catch (error) {
    console.error("Error fetching consent form:", error);
    return NextResponse.json({ error: "Failed to fetch consent form" }, { status: 500 });
  }
}

// Delete a consent form. Replaces the embedded `/api/clients/[id]/consent-forms/[formId]`
// route. Scope-checked.
export async function DELETE(_request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id } = await params;

    const consentForm = await ConsentForm.findOne({ _id: id, practiceId: user.practiceId });
    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    const allowed = await visibleClientIds(user);
    if (!allowed.some((cid) => cid.toString() === consentForm.clientId.toString())) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    if (consentForm.documentKey) {
      try {
        await deleteFile(consentForm.documentKey);
      } catch (e) {
        console.error("Error deleting consent file:", e);
      }
    }
    if (consentForm.signedDocumentKey) {
      try {
        await deleteFile(consentForm.signedDocumentKey);
      } catch (e) {
        console.error("Error deleting signed consent file:", e);
      }
    }

    await consentForm.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting consent form:", error);
    return NextResponse.json({ error: "Failed to delete consent form" }, { status: 500 });
  }
}
