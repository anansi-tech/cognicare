# Round 7.2 — Practice per-seat billing (billing only)

> Branch `dev`, working dir `products/cognicare`. Scope: make the **Practice** plan charge for the
> number of seats the buyer picks. **Explicitly NOT in scope:** org/practice model, inviting
> clinicians, admin team management, practice-scoped clients. Those are a later track (pairs with
> Auth.js v5). This round only makes Practice checkout bill N seats correctly.

## Why just this

The Practice price is per-clinician, but `checkout/route.js` hardcodes `quantity: 1`, so clicking
Practice today bills exactly one seat regardless of practice size — a broken purchase. This fixes the
billing math. It does NOT create the concept of a team; buying 5 seats charges for 5 but doesn't yet
let 5 clinicians share an account (that's the deferred track, and that's fine — you're simulating the
*purchase*, not team ops).

## 1. Checkout route — accept and pass `quantity`

`src/app/api/billing/checkout/route.js`:
```js
const { priceId, quantity } = await req.json();
if (!priceId) return NextResponse.json({ error: "priceId required" }, { status: 400 });

const seats = Math.max(1, Math.min(Number(quantity) || 1, 100)); // clamp 1–100, default 1
```
Then in the session:
```js
line_items: [{ price: priceId, quantity: seats }],
```
Solo callers send no `quantity` → defaults to 1, unchanged. Only Practice sends a seat count.

## 2. Billing page — seat picker on the Practice card

`src/app/billing/page.js`:
- Add seat state: `const [seats, setSeats] = useState(2);` (Practice implies 2+; default 2).
- On the **Practice** card only, render a small number input above the Subscribe button:
  ```jsx
  {plan.id === "practice" && (
    <div className="mt-4 flex items-center gap-2">
      <label htmlFor="seats" className="text-sm text-gray-600">Clinicians</label>
      <input
        id="seats" type="number" min={2} max={100} value={seats}
        onChange={(e) => setSeats(Math.max(2, Math.min(100, Number(e.target.value) || 2)))}
        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
      />
    </div>
  )}
  ```
- Show a live total on the Practice card so the buyer sees the real charge:
  ```jsx
  {plan.id === "practice" && (
    <p className="mt-2 text-sm text-gray-500">
      {seats} clinicians × $59 = <span className="font-medium text-gray-900">${seats * 59}/mo</span>
    </p>
  )}
  ```
- Pass seats through `subscribe`:
  ```js
  const subscribe = async (priceId, quantity = 1) => {
    // …unchanged…
    body: JSON.stringify({ priceId, quantity }),
    // …
  };
  ```
  Solo button: `onClick={() => subscribe(plan.priceEnv)}` (quantity defaults to 1).
  Practice button: `onClick={() => subscribe(plan.priceEnv, seats)}`.

## 3. Webhook — no change needed

The slim webhook only caches `sub.status`; seat quantity lives in Stripe and is reflected on the
subscription there. Customers change seat count later via the Stripe Customer Portal (enable
"update quantity" in the portal settings — dashboard toggle, no code). Leave the webhook as-is.

## 4. Stripe dashboard — confirm

- The Practice **Price** must be a standard recurring per-unit price (it is — quantity multiplies it).
- In Customer Portal settings, enable **update quantity** so a practice can add/remove seats
  post-purchase without you writing seat-management code.

## Acceptance criteria

1. Solo checkout: still bills 1 seat (no quantity sent).
2. Practice card: seat input (min 2), live total updates (`5 × $59 = $295/mo`), and Checkout opens
   with that quantity — verify in Stripe test mode the subscription shows the chosen quantity.
3. Checkout clamps absurd input (0, negative, 999) to the 1–100 range server-side.
4. `npm run lint` clean.

## Commit

```
feat(cognicare): Practice per-seat billing — seat picker + quantity through checkout
```

## Still deferred (unchanged)

Team management — org/practice model, clinician invites, admin role, practice-scoped clients,
enforcing active-clinicians ≤ paid-seats — remains a later track to do alongside Auth.js v5. Buying
N seats bills correctly now; it does not yet provision N usable logins. Note that in the PR so it's
tracked.
