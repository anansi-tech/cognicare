import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Session from "@/models/session";
import Client from "@/models/client";
import { sendEmail } from "@/lib/email";

export const maxDuration = 60;
// Node runtime — Mongoose + Resend SDK aren't edge-safe.
export const runtime = "nodejs";

// Daily reminder cron (Round 15). Vercel Cron hits this with
// `Authorization: Bearer ${CRON_SECRET}` per the cron config in vercel.json.
// Picks up tomorrow's still-scheduled sessions that haven't already been
// reminded and emails the client. `reminderSentAt` is the idempotency
// guard — re-runs same day won't double-send.
//
// Local dev: trigger manually with
//   curl http://localhost:3000/api/cron/appointment-reminders \
//     -H "Authorization: Bearer $CRON_SECRET"
export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Tomorrow's UTC window (good enough for one practice — timezone-correct
  // reminder windows are a future refinement noted in the PR).
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const sessions = await Session.find({
    status: "scheduled",
    date: { $gte: start, $lte: end },
    reminderSentAt: { $exists: false },
  }).lean();

  let sent = 0;
  let skipped = 0;
  for (const s of sessions) {
    try {
      const client = await Client.findById(s.clientId).select("name contactInfo").lean();
      const to = client?.contactInfo?.email;
      if (!to) {
        skipped++;
        continue;
      }
      await sendEmail({
        to,
        subject: "Appointment reminder",
        html: reminderHtml({ name: client.name, date: s.date, format: s.format }),
      });
      await Session.updateOne({ _id: s._id }, { $set: { reminderSentAt: new Date() } });
      sent++;
    } catch (e) {
      console.error("reminder failed", s._id?.toString(), e);
    }
  }

  return NextResponse.json({ checked: sessions.length, sent, skipped });
}

function reminderHtml({ name, date, format }) {
  const when = new Date(date).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const formatLine =
    format === "video"
      ? "<p>This is a video session — your clinician will share the connection link.</p>"
      : format === "phone"
        ? "<p>This is a phone session — your clinician will call you at the scheduled time.</p>"
        : format === "chat"
          ? "<p>This is a chat session — log in at the scheduled time.</p>"
          : "<p>This is an in-person session. Please arrive a few minutes early.</p>";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a202c;">
      <h2 style="color: #312e81; margin-bottom: 16px;">Appointment reminder</h2>
      <p>Hi ${escapeHtml(name || "there")},</p>
      <p>This is a friendly reminder of your upcoming appointment on
        <strong>${when}</strong>.</p>
      ${formatLine}
      <p>If you need to reschedule or cancel, please contact your clinician as soon as possible.</p>
      <p>See you soon,<br/>CogniCare</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}
