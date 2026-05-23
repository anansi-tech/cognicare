import { Resend } from "resend";

// Single source of truth for outbound email. Callers don't re-instantiate
// Resend or repeat the from/error pattern. When RESEND_API_KEY is unset
// (local dev without Resend wired) we no-op cleanly so flows that *try*
// to email still succeed end-to-end.
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "CogniCare <onboarding@resend.dev>";

export async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — email not sent:", subject);
    return { skipped: true };
  }
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) {
    console.error("Email send failed:", error);
    throw new Error(error.message || "Email send failed");
  }
  return { id: data?.id };
}
