import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope, visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import { createAndSendConsent } from "@/lib/consent";

// Create a consent request for a client. Scope-checked: clinicians may only
// request on their own assigned clients; owner on any practice client.
// Round 13: no file upload — the template is the source of truth; the
// signed PDF is generated server-side at sign time.
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { clientId, type, notes } = body;

    if (!clientId || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: clientId, ...scope });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const consentForm = await createAndSendConsent({
      client,
      counselorId: user.id,
      type,
      notes: notes || "",
    });

    return NextResponse.json({
      message: "Consent request created successfully.",
      newConsentForm: consentForm.toObject(),
    });
  } catch (error) {
    console.error("Error creating consent form:", error);
    return NextResponse.json({ error: "Failed to create consent form" }, { status: 500 });
  }
}

// List consent forms for a client (scope-checked). Used by ClientDetail.
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    await connectDB();
    const allowed = await visibleClientIds(user);
    if (!allowed.some((id) => id.toString() === String(clientId))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const consentForms = await ConsentForm.find({
      clientId,
      practiceId: user.practiceId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(consentForms);
  } catch (error) {
    console.error("Error fetching consent forms:", error);
    return NextResponse.json({ error: "Failed to fetch consent forms" }, { status: 500 });
  }
}
