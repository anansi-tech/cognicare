import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clientScope, visibleClientIds } from "@/lib/practice";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { getConsentFormTemplate } from "@/lib/templates/consentFormTemplate";
import { connectDB } from "@/lib/mongodb";
import Client from "@/models/client";
import ConsentForm from "@/models/consentForm";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

const generateToken = () => crypto.randomBytes(32).toString("hex");

// Create a consent request for a client. Scope-checked: clinicians may only
// request on their own assigned clients; owner on any practice client.
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const clientId = formData.get("clientId");
    const type = formData.get("type");
    const file = formData.get("file");
    const notes = formData.get("notes");

    if (!clientId || !type || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const scope = await clientScope(user);
    const client = await Client.findOne({ _id: clientId, ...scope });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const template = getConsentFormTemplate(type);

    const fileKey = generateFileKey("consent-forms", file.name);
    const documentUrl = await uploadFile(file, fileKey, {
      type: "consent-form",
      clientId: String(client._id),
      formType: type,
      version: template.version,
    });

    const token = generateToken();
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7);

    const consentForm = await ConsentForm.create({
      practiceId: client.practiceId,
      clientId: client._id,
      requestedBy: user.id,
      type,
      version: template.version,
      document: documentUrl,
      documentKey: fileKey,
      status: "pending",
      token,
      tokenExpires,
      notes: notes || "",
    });

    // Send the client a portal link to sign.
    const clientEmail = client.contactInfo?.email;
    const shareableLink = `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/consent/${token}`;
    if (clientEmail) {
      try {
        await sendEmail({
          to: clientEmail,
          subject: `Action Required: Please Sign Consent Form - ${template.title}`,
          html: `
            <p>Dear ${client.name},</p>
            <p>Your counselor, ${user.name || "Your Counselor"}, has requested that you review and sign a consent form. Please click the secure link below to access the form:</p>
            <p><a href="${shareableLink}" target="_blank">Access Consent Form</a></p>
            <p>This link will expire in 7 days.</p>
            <p>If you have any questions, please contact your counselor.</p>
            <p>Thank you,</p>
            <p>CogniCare Platform</p>
          `,
        });
      } catch (emailError) {
        console.error("Error sending consent email:", emailError);
      }
    } else {
      console.warn(
        `Client ${clientId} does not have an email address. Cannot send consent form link via email.`
      );
    }

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
