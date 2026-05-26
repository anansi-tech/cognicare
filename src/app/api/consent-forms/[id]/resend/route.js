import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { connectDB } from "@/lib/mongodb";
import ConsentForm from "@/models/consentForm";
import Client from "@/models/client";
import { sendEmail } from "@/lib/email";
import { getConsentFormTemplate } from "@/lib/templates/consentFormTemplate";
import crypto from "crypto";
import {
  logAuditEvent,
  auditMetaFromRequest,
  AuditActions,
  EntityTypes,
} from "@/lib/audit";

// Therapist endpoint: re-issue the token + expiry on a pending/expired
// consent form and email the client a fresh link. Scope-checked via the
// parent client's visibility. Audited.
export async function POST(req, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();

    const form = await ConsentForm.findOne({ _id: id, practiceId: user.practiceId });
    if (!form) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    // Inherit visibility from the parent client.
    const allowed = await visibleClientIds(user);
    if (!allowed.some((cid) => cid.toString() === form.clientId.toString())) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    if (form.status === "signed") {
      return NextResponse.json(
        { error: "This consent has already been signed." },
        { status: 400 }
      );
    }

    const client = await Client.findById(form.clientId).select("name contactInfo").lean();
    if (!client?.contactInfo?.email) {
      return NextResponse.json(
        { error: "Client has no email address on file." },
        { status: 400 }
      );
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);

    form.token = newToken;
    form.tokenExpires = newExpiry;
    form.status = "pending";
    await form.save();

    const template = getConsentFormTemplate(form.type);
    const shareableLink = `${process.env.NEXT_PUBLIC_APP_URL}/client-portal/consent/${newToken}`;
    try {
      await sendEmail({
        to: client.contactInfo.email,
        subject: `Action Required: Please Sign Consent Form - ${template?.title || "Consent"}`,
        html: `
          <p>Dear ${client.name},</p>
          <p>Your counselor, ${user.name || "Your Counselor"}, has resent the consent form for your review and signature.</p>
          <p><a href="${shareableLink}" target="_blank">Open and sign the consent form</a></p>
          <p>This new link will expire in 7 days.</p>
          <p>Thank you,</p>
          <p>CogniCare Platform</p>
        `,
      });
    } catch (emailError) {
      console.error("Error sending resend email:", emailError);
      // Don't fail the resend — the new token is live and can be copied
      // manually if needed.
    }

    await logAuditEvent({
      userId: user.id,
      practiceId: user.practiceId,
      action: AuditActions.UPDATE,
      entityType: EntityTypes.DOCUMENT,
      entityId: form._id,
      details: { kind: "consent_resend", clientId: form.clientId.toString() },
      ...auditMetaFromRequest(req),
    });

    return NextResponse.json({ ok: true, link: shareableLink });
  } catch (error) {
    console.error("Error resending consent form:", error);
    return NextResponse.json({ error: "Failed to resend consent form" }, { status: 500 });
  }
}
