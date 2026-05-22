import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadFile, getSignedDownloadUrl } from "@/lib/storage";
import { generateFileKey } from "@/lib/storage";
import { getConsentFormTemplate } from "@/lib/templates/consentFormTemplate";
import Client from "@/models/client";
import crypto from "crypto";
import { Resend } from "resend";

// Instantiate Resend (ensure RESEND_API_KEY is in your .env)
const resend = new Resend(process.env.RESEND_API_KEY);

const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const clientId = formData.get("clientId");
    const type = formData.get("type");
    const file = formData.get("file");
    const notes = formData.get("notes");

    if (!clientId || !type || !file) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get template to validate type and version
    const template = getConsentFormTemplate(type);

    // Upload file to storage
    const fileKey = generateFileKey("consent-forms", file.name);
    const documentUrl = await uploadFile(file, fileKey, {
      type: "consent-form",
      clientId,
      formType: type,
      version: template.version,
    });

    // Generate token
    const token = generateToken();
    const tokenExpires = new Date();
    tokenExpires.setDate(tokenExpires.getDate() + 7); // Token expires in 7 days

    // Create consent form object
    const newConsentFormEntry = {
      type: type,
      version: template.version,
      document: documentUrl,
      documentKey: fileKey,
      status: "pending",
      token,
      tokenExpires,
      requestedBy: user._id,
      requestedAt: new Date(),
      notes: notes || "",
    };

    // Update client with new consent form
    const updatedClient = await Client.findByIdAndUpdate(
      clientId,
      {
        $push: { consentForms: newConsentFormEntry },
      },
      { new: true }
    ).populate("counselorId", "name email");

    if (!updatedClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Find the newly added form in the updated client doc to get its _id if needed
    const addedForm = updatedClient.consentForms.find((form) => form.token === token);

    // --- Send Email to Client ---
    const clientEmail = updatedClient.contactInfo?.email;
    const counselorName = user.name || "Your Counselor";
    const shareableLink = `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/consent/${token}`;

    if (clientEmail) {
      try {
        const emailData = await resend.emails.send({
          from: `CogniCare <onboarding@resend.dev>`,
          to: [clientEmail],
          subject: `Action Required: Please Sign Consent Form - ${template.title}`,
          html: `
            <p>Dear ${updatedClient.name},</p>
            <p>Your counselor, ${counselorName}, has requested that you review and sign a consent form. Please click the secure link below to access the form:</p>
            <p><a href="${shareableLink}" target="_blank">Access Consent Form</a></p>
            <p>This link will expire in 7 days.</p>
            <p>If you have any questions, please contact your counselor.</p>
            <p>Thank you,</p>
            <p>CogniCare Platform</p>
          `,
        });
        console.log("Email sent successfully:", emailData.id);
      } catch (emailError) {
        console.error("Error sending consent email:", emailError);
      }
    } else {
      console.warn(
        `Client ${clientId} does not have an email address. Cannot send consent form link via email.`
      );
    }
    // --- End Send Email ---

    // Return the newly created form object and the updated client
    return NextResponse.json({
      message: "Consent request created successfully.",
      newConsentForm: addedForm || newConsentFormEntry,
      client: updatedClient,
    });
  } catch (error) {
    console.error("Error creating consent form:", error);
    return NextResponse.json({ error: "Failed to create consent form" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }

    const consentForms = await ConsentForm.find({
      clientId,
      therapistId: user._id,
    }).sort({ createdAt: -1 });

    return NextResponse.json(consentForms);
  } catch (error) {
    console.error("Error fetching consent forms:", error);
    return NextResponse.json({ error: "Failed to fetch consent forms" }, { status: 500 });
  }
}
