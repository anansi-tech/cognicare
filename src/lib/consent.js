import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import ConsentForm from "@/models/consentForm";
import { getConsentFormTemplate } from "@/lib/templates/consentFormTemplate";
import { sendEmail } from "@/lib/email";

/**
 * The ONE definition of "this client has consented to AI processing":
 * a signed consent form on file, OR the clinician recorded consent obtained
 * in person (client.consentOverride, set via the consent-status PATCH).
 * Used by the consent-status route, the agent-workflow gate, and the
 * dashboard aggregate — so they can never disagree.
 */
export function isConsented({ forms = [], client }) {
  return forms.some((f) => f.status === "signed") || !!client?.consentOverride?.by;
}

/**
 * Create a consent form record and email the client a sign link.
 * Caller must have already verified the client is visible to the counselor.
 * Best-effort email: a send failure does not throw.
 */
export async function createAndSendConsent({ client, counselorId, type, notes = "" }) {
  await connectDB();

  const template = getConsentFormTemplate(type);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date();
  tokenExpires.setDate(tokenExpires.getDate() + 7);

  const consentForm = await ConsentForm.create({
    practiceId: client.practiceId,
    clientId: client._id,
    requestedBy: counselorId,
    type,
    version: template.version,
    status: "pending",
    token,
    tokenExpires,
    notes,
  });

  const clientEmail = client.contactInfo?.email;
  if (clientEmail) {
    const shareableLink = `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/consent/${token}`;
    try {
      await sendEmail({
        to: clientEmail,
        subject: `Action Required: Please Sign Consent Form - ${template.title}`,
        html: `
          <p>Dear ${client.name},</p>
          <p>Your counselor has requested that you review and sign a consent form before your first appointment. Please click the secure link below to access and sign:</p>
          <p><a href="${shareableLink}" target="_blank">Review and Sign Consent Form</a></p>
          <p>This link will expire in 7 days.</p>
          <p>If you have any questions, please contact your counselor directly.</p>
          <p>Thank you,<br>CogniCare Platform</p>
        `,
      });
    } catch (emailError) {
      console.error("Consent email send failed:", emailError);
    }
  }

  return consentForm;
}
