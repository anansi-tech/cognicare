# Round 13 — Consent Forms: real e-signature

> Branch `dev`, working dir `products/cognicare`. Turn the clunky download-print-upload signing into
> modern in-browser **type-to-sign** e-signature with a server-generated signed PDF. Plus cleanup:
> delete the duplicate sign route, key the portal by token (not id), add resend/extend, verify the
> minor template. The architecture (token portal, lifecycle, scoping, templates) is already sound —
> this fixes the signing mechanism, which is the one genuinely outdated piece.

## What's wrong today (verified)

- "Signing" = the client **downloads** the form, signs it externally, and **uploads a file**. Poor
  experience (no printer/scanner on a phone), and not how modern e-consent works.
- **Duplicate sign route:** `/api/consent-forms/sign` and `/api/consent-forms/[id]/sign` are
  functionally identical (both authorize by token). The portal only calls `/sign`; `/[id]/sign` is dead.
- **URL/identity smell:** portal is `/client-portal/consent/[id]` and even passes `id` *as* the token
  (`formData.append("token", id)`) — works only because the link carries the token. Key by token.
- **No resend** if the 7-day token expires before the client signs.
- Leftover `console.log`s in the portal page.

Available building blocks: `pdf-lib` (already a dep, used by invoices), GCS storage
(`uploadFile`/`getSignedDownloadUrl`/`generateFileKey`), `sendEmail` (R11), templates in
`lib/templates/consentFormTemplate.js`.

## Legal note (why type-to-sign is fine)

Under the US ESIGN Act, a typed name with clear intent ("I agree") plus a timestamp is a valid,
binding electronic signature. We also capture IP + user-agent for the audit trail. No drawn signature
needed. The generated PDF embeds all of this as the signature block.

---

## Part 1 — Capture e-signature fields on the model

`src/models/consentForm.js`, add a `signature` sub-block (the legal record of the act):
```js
signature: {
  typedName: { type: String },     // what the client typed
  agreedAt:  { type: Date },       // timestamp of the "I agree" submit
  ipAddress: { type: String },
  userAgent: { type: String },
},
```
Keep `signedDocument`/`signedDocumentKey` (now the **generated** PDF, not an upload). Keep status
lifecycle. `dateSigned` = `signature.agreedAt`.

## Part 2 — Replace the sign endpoint (type-to-sign + generate PDF)

Rewrite `src/app/api/consent-forms/sign/route.js` to accept a typed signature (JSON, not a file
upload) and **generate** the signed PDF server-side:

```js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ConsentForm from "@/models/consentForm";
import { uploadFile, generateFileKey } from "@/lib/storage";
import { getConsentFormTemplate } from "@/lib/templates/consentFormTemplate";
import { buildSignedConsentPdf } from "@/lib/consent-pdf";   // new, Part 3

export async function POST(request) {
  const { token, typedName, agreed } = await request.json();
  if (!token || !typedName || !agreed) {
    return NextResponse.json({ error: "Name and agreement are required" }, { status: 400 });
  }
  await connectDB();
  const form = await ConsentForm.findOne({ token, tokenExpires: { $gt: new Date() }, status: "pending" });
  if (!form) return NextResponse.json({ error: "This consent link is invalid or has expired" }, { status: 404 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const agreedAt = new Date();

  // Generate the signed PDF from the template text + signature block.
  const template = getConsentFormTemplate(form.type);
  const pdfBytes = await buildSignedConsentPdf({
    title: template.title, body: template.content, version: form.version,
    typedName, agreedAt, ip,
  });
  const key = generateFileKey("signed-consent-forms", `${form._id}.pdf`);
  await uploadFile(
    new File([pdfBytes], `${form._id}.pdf`, { type: "application/pdf" }),
    key,
    { type: "signed-consent-form", clientId: String(form.clientId) }
  );

  form.signature = { typedName, agreedAt, ipAddress: ip, userAgent: ua };
  form.signedDocumentKey = key;
  form.signedDocument = key;          // store key; resolve to signed URL on read
  form.status = "signed";
  form.dateSigned = agreedAt;
  await form.save();

  return NextResponse.json({ status: "signed", dateSigned: agreedAt });
}
```
> `uploadFile` currently takes a File-like with `.arrayBuffer()`. If passing a Node `File` is awkward
> in your runtime, adapt `uploadFile` to also accept a `Buffer` — small tweak. Keep it on Node runtime.

**Delete** `src/app/api/consent-forms/[id]/sign/route.js` (the duplicate). Grep that nothing calls it.

## Part 3 — Signed PDF builder

`src/lib/consent-pdf.js` using `pdf-lib`:
```js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Renders the consent text + a signature block into a one-or-more page PDF.
export async function buildSignedConsentPdf({ title, body, version, typedName, agreedAt, ip }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  // simple text layout: title (bold), wrapped body lines, then signature block.
  // (paginate body across pages; keep it readable, not pixel-perfect.)
  // Signature block at end:
  //   "Electronically signed by: {typedName}"
  //   "Date: {agreedAt ISO}    Version: {version}    IP: {ip}"
  //   a line noting this constitutes a legally binding electronic signature.
  // return await pdf.save();  // Uint8Array
}
```
Keep layout simple and legible (this is a record, not a design piece). Strip markdown `#`/`-` from the
template content to plain lines, or render headings bold by detecting `#`. Don't over-engineer.

## Part 4 — Rewrite the portal page (type-to-sign UI, keyed by token)

**Move** the portal route to be token-keyed: `src/app/client-portal/consent/[token]/page.js`
(rename the `[id]` folder to `[token]`). Update the emailed link in the create route to
`/client-portal/consent/${token}` (it may already use token — verify).

The page:
- Fetch the form for display via a **token** lookup (add/confirm `GET /api/consent-forms?token=...`
  or a `/api/consent-forms/by-token/[token]` read that returns the form *content* to display +
  status; never require a session).
- Render the consent **text** (from the template/`document`) so the client reads it in-browser.
- Below it: a **typed-name input** + an **"I have read and agree to this consent form" checkbox** +
  a submit button (disabled until both filled). On submit → `POST /api/consent-forms/sign`
  `{ token, typedName, agreed: true }`.
- On success: show a confirmation + a **Download signed copy** link (resolve `signedDocumentKey` to a
  signed URL). If already `signed`, show the signed state + download (idempotent — don't allow
  re-signing).
- Remove all `console.log`s and the file-upload UI.
- Mobile-first: this is opened on phones. Big tap targets, readable text.

## Part 5 — Resend / extend expired invites

Add `POST /api/consent-forms/[id]/resend` (therapist, scope-guarded via `clientScope`):
- If status is `pending` or `expired`: issue a fresh `token` + `tokenExpires` (now+7d), set status
  back to `pending`, and email the client the new link via `sendEmail`. Audit it.
- Surface a **Resend** button in the therapist's consent UI for pending/expired forms.

## Part 6 — Verify the minor template captures guardian consent

Check `lib/templates/consentFormTemplate.js` `minor` template: it must include **guardian name +
relationship** and that the guardian is the one consenting on behalf of the minor. If it's just a
relabeled general form, add a guardian signature block (typed guardian name becomes the
`signature.typedName`, with a line identifying the guardian and relationship). For minor forms, the
portal label should say "Parent/Guardian name" instead of just "Your name."

## Acceptance criteria

1. Client opens the emailed link → reads the form in-browser → types name + checks agree → submits →
   status "signed", **no file upload anywhere**. A signed **PDF** is generated and downloadable by
   both client (portal) and therapist (chart).
2. The signed PDF contains the consent text + a signature block (typed name, timestamp, version, IP,
   binding-signature statement).
3. Portal is keyed by **token** (`/client-portal/consent/[token]`); the form id is not in the URL.
   Re-visiting a signed form shows signed state + download, can't re-sign.
4. `/api/consent-forms/[id]/sign` deleted; `grep -rn "consent-forms/\[id\]/sign\|/sign" src` shows
   only the canonical `/sign` route and its callers.
5. Therapist can **resend** a pending/expired consent (new token emailed); audited.
6. Minor template captures guardian name + relationship; portal labels adjust for minor type.
7. No `console.log` in the portal page. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
feat(cognicare): e-signature fields on ConsentForm (typed name, timestamp, IP)
feat(cognicare): type-to-sign endpoint + server-generated signed PDF (pdf-lib)
feat(cognicare): rewrite client portal — in-browser type-to-sign, token-keyed, mobile-first
feat(cognicare): resend/extend expired consent invites (audited)
fix(cognicare): minor consent template captures guardian; delete duplicate sign route
```

## Next flow

After consent: the **Report generation flow + artifacts** (how compiled Reports are built, viewed,
exported), then scheduling/calendar. Same approach — read the whole flow, judge against practice
norms, streamline.
