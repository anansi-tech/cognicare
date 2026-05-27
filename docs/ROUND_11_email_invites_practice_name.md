# Round 11 — Email helper + invite emails + practice name at signup

> Branch `dev`, working dir `products/cognicare`. Three small, related onboarding pieces. Resend is
> already installed and used (invoice reminders, consent forms) but initialized inline each time and
> NOT used for invites. This round adds one shared email helper, sends invite emails through it, and
> lets a signup set the practice name. Unblocks the e2e test of signup/invite with real email.

## Part 1 — Shared email helper

Resend is `new Resend(...)`'d inline in two files today. Centralize it.

### `src/lib/email.js`
```js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "CogniCare <noreply@yourdomain.com>";

// Thin wrapper so callers don't re-instantiate Resend or repeat from/error handling.
export async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — email not sent:", subject);
    return { skipped: true };
  }
  const { data, error } = await resend.emails.send({
    from: FROM, to, subject, html, ...(replyTo ? { replyTo } : {}),
  });
  if (error) {
    console.error("Email send failed:", error);
    throw new Error(error.message || "Email send failed");
  }
  return { id: data?.id };
}
```
> Set `RESEND_FROM` env to your verified Resend sender (e.g. `CogniCare <noreply@cognicare.app>`).
> Refactor the two existing inline usages (`invoices/[invoiceId]/reminder/route.js`,
> `consent-forms/route.js`) to call `sendEmail(...)` instead of `new Resend` — same behavior, one
> source of truth. Keep their existing subjects/HTML.

## Part 2 — Send the invite email

`src/app/api/practice/invite/route.js`: it already creates the invitation and computes `inviteLink`.
Add the email send right after `Invitation.create` (and for the re-used pending invite, optionally
re-send). The invite needs the practice name and inviter name for a human message.

```js
import { sendEmail } from "@/lib/email";
import Practice from "@/models/practice";
// ...after creating `invitation` and before the audit/return:
const practice = await Practice.findById(user.practiceId).select("name").lean();
const link = inviteLink(token);
try {
  await sendEmail({
    to: email,
    subject: `You're invited to join ${practice?.name ?? "a practice"} on CogniCare`,
    html: inviteEmailHtml({ practiceName: practice?.name ?? "the practice", inviterName: user.name, link }),
  });
} catch (e) {
  // Don't fail the invite if email hiccups — the link is still returned for manual share.
  console.error("Invite email failed; link still available:", e);
}
```
Add a small `inviteEmailHtml({ practiceName, inviterName, link })` (plain, branded-enough): a line of
context ("{inviterName} invited you to join {practiceName} on CogniCare"), the link as a button/anchor,
and a note that it expires in 7 days. Keep returning `{ invitation, link }` so the owner can still
copy it manually if needed.

> `user.name` is on the session (Round 9 keeps name in the token? if not, fetch it from User by id —
> check; if the session lacks `name`, `await User.findById(user.id).select("name")`).

## Part 3 — Practice name at signup

Today registration auto-names the practice `"{name}'s Practice"`. Let a signup optionally set the
real practice name (the owner's wife runs a *named* group practice).

### `src/app/(auth)/signup/page.js`
Add an **optional** field "Practice name" (after name/email). Include it in the POST body as
`practiceName`. Copy/placeholder: "Practice name (optional)" with helper text "Leave blank if you're
a solo practitioner — you can change this later."

### `src/app/api/auth/register/route.js`
Accept `practiceName` and use it when creating the practice (only on the **new-practice** branch — an
invited signup joins an existing practice and ignores it):
```js
const practice = await Practice.create({
  name: (practiceName && practiceName.trim()) || `${name}'s Practice`,
  ownerId: user._id,
  seats: 1,
});
```
> Invited signups (with a valid `inviteToken`, from Round 10) must NOT create a practice or read
> `practiceName` — they join `invitation.practiceId`. Confirm that branch is untouched.

### (Optional, small) Let the owner rename later
On `/team` (owner view), a small "Practice name" inline edit → `PATCH /api/practice` updating
`name` (owner-only guard via `isPracticeOwner`). Nice for the solo user who later forms a group.
Skip if it adds churn — note as follow-up.

## Acceptance criteria

1. `lib/email.js` is the only place `new Resend` appears; the two prior inline usages call
   `sendEmail` and still work (reminder + consent emails send as before).
2. Owner invites a clinician → an actual email arrives (your Resend) with a working invite link;
   if Resend errors, the invite still succeeds and returns the link (no hard failure).
3. New signup with a practice name → the Practice is created with that name (visible on /team);
   blank → falls back to "{name}'s Practice". Invited signup ignores practiceName and joins the
   inviter's practice.
4. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
refactor(cognicare): shared lib/email.js helper; route Resend usages through it
feat(cognicare): send invitation emails via Resend
feat(cognicare): optional practice name at signup (defaults to "{name}'s Practice")
```

## Next: e2e test together

Once 11 is in, I'll write the onboarding/billing/team e2e guide and we run it: register (with a
practice name) → subscribe to Practice with 3 seats (trial) → invite two clinicians (real emails) →
they accept and land in the practice → assign/reassign a client → confirm visibility + seat
enforcement. That walkthrough is also where we'll *discover* the patient-invoicing scope state, which
then drives Round 12.
