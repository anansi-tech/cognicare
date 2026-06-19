# Round 31 — Consent action when client has no email (Resend → Copy link)

> Branch `dev`, working dir `cognicare`, `src/app/components/clients/ClientDetail.js`. The **Resend**
> button on a pending consent form stays active even when the client has no email — a dead action
> (nothing to email). Fix: when there's no email, swap Resend for **Copy link** (the therapist still
> needs to get the signing link to the client). When there IS an email, Resend works as today.

## Context (verified)
- The `client` object with `contactInfo.email` is available in ClientDetail (used throughout).
- A copy-link pattern already exists (the create toast builds
  `${window.location.origin}/client-portal/consent/${token}` and copies via `navigator.clipboard`).
- The consent list GET returns the full form (`.lean()`), so each `form.token` is available to build
  the link.
- Resend button lives in the consent list (`form.status !== "signed"` → Resend), plus a "client" page
  surface per the report.

## The fix
In the consent list row (and any other Resend surface), branch on whether the client has an email:

```jsx
{form.status !== "signed" && (
  client?.contactInfo?.email ? (
    <button
      onClick={(e) => handleResendConsent(form._id, e)}
      title="Email the client a fresh signing link"
      className="...existing..."
    >
      Resend
    </button>
  ) : (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const link = `${window.location.origin}/client-portal/consent/${form.token}`;
        navigator.clipboard.writeText(link);
        toast.success("Signing link copied — share it with the client.");
      }}
      title="No email on file — copy the signing link to share manually"
      className="...same styling..."
    >
      Copy link
    </button>
  )
)}
```

Notes:
- `e.stopPropagation()` so it doesn't trigger the row's `handleViewConsent`.
- Use the existing `form.token`. If a form is **expired**, the token may be stale — for expired forms
  with no email, "Copy link" should ideally issue a fresh token first. Simplest v1: if
  `form.status === "expired"`, the Copy-link handler calls the resend endpoint logic to mint a new
  token, then copies. If that's awkward, at minimum copy the current link and note expiry; don't block.
- Apply the same email-aware branch to the **client-page** resend surface mentioned (wherever a Resend
  appears outside the consent tab).

## Optional polish
- When no email, also show a tiny inline note near the consent section: "No email on file — use Copy
  link to share." So it's clear why Resend isn't there.

## Acceptance
1. Pending consent form, client **has** email → **Resend** button (emails a fresh link), as today.
2. Pending consent form, client has **no** email → **Copy link** button instead; clicking copies the
   portal signing link and toasts confirmation. No dead/no-op Resend.
3. Works on both the consent tab and the client-page surface.
4. Clicking doesn't also open the form view (stopPropagation).
5. `npm test`, `npm run lint`, `npm run build` clean.

## Commit
```
fix(cognicare): no-email clients get Copy-link instead of dead Resend on consent forms
```
