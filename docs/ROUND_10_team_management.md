# Round 10 — Team Management (invites, assignment visibility, reassignment, seats)

> Branch `dev`, working dir `products/cognicare`. Builds team features on the Round 8 practice model
> + Round 9 v5 auth. This is where a multi-clinician practice (the owner's wife's 3-therapist
> practice) comes online. Feature round — read the rules carefully; they encode confidentiality
> decisions, not just UI.

## The rules (decided with the owner)

1. **Visibility:** a clinician sees only clients **assigned to them** (`counselorId === user.id`).
   The **owner sees all** clients in the practice. (HIPAA minimum-necessary default.)
2. **Reassignment:** a clinician can reassign a client **only if it's currently theirs** (hand off
   their own work). The **owner can reassign any** client in the practice. Reassignment is a
   **transfer** (single assigned clinician), not a share — the previous clinician loses access once
   handed off. Every reassignment writes an audit event.
3. **Management:** the **owner** invites/removes clinicians and manages billing/seats. Everyone else
   is a clinician — no admin tier. (`role` stays, but "owner" = `practice.ownerId === user.id`, which
   is the real check; don't overload the `role` enum.)
4. **Seats:** active clinicians in a practice must be ≤ `practice.seats` (paid). Inviting beyond seats
   is blocked with a clear "add seats first" message.

## Part 1 — Visibility: tighten clients to assignment-based

**Today the clients GET filters by `practiceId` only — so every clinician sees the whole practice
roster.** That violates rule 1. Change the visibility filter:

`src/app/api/clients/route.js` GET — build the query by role:
```js
const isOwner = String(user.practiceId) && await isPracticeOwner(user);
const query = isOwner
  ? { practiceId: user.practiceId }                       // owner sees all
  : { practiceId: user.practiceId, counselorId: user.id }; // clinician sees own
```
Add a helper `isPracticeOwner(user)` in `src/lib/practice.js`:
```js
import Practice from "@/models/practice";
import { connectDB } from "@/lib/mongodb";
export async function isPracticeOwner(user) {
  if (!user?.practiceId) return false;
  await connectDB();
  const p = await Practice.findById(user.practiceId).select("ownerId").lean();
  return p?.ownerId?.toString() === user.id;
}
```
Apply the **same visibility rule** to any other route that lists or fetches a single client/session
and currently keys on `practiceId` alone: `clients/[id]`, `sessions` list, `sessions/[id]`,
`ai-reports`, dashboard stats. A clinician fetching a client that isn't theirs → 403 (or 404 to avoid
leaking existence — prefer **404** for confidentiality). Owner → allowed.

> This is the most security-sensitive part of the round. The check must be server-side in each route
> (not just hidden in the UI). Test that clinician B literally cannot GET clinician A's client by ID.

## Part 2 — Invitations

### Model `src/models/invitation.js`
```js
import mongoose from "mongoose";
const invitationSchema = new mongoose.Schema({
  practiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Practice", required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, unique: true },     // random, emailed
  status: { type: String, enum: ["pending", "accepted", "revoked"], default: "pending" },
  expiresAt: { type: Date, required: true },                 // e.g. 7 days
}, { timestamps: true });
export default mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);
```

### `POST /api/practice/invite` (owner only)
- Guard: `isPracticeOwner(user)` else 403.
- **Seat check:** count active clinicians in the practice + pending invites; if `>= practice.seats`,
  return 409 with `{ error: "All seats are in use. Add seats in Billing to invite more." }`.
- Create an Invitation with a random `token` (crypto), `expiresAt` = now + 7 days.
- Email the invite link (`${NEXT_PUBLIC_APP_URL}/invite/${token}`). If no email service is wired yet,
  **return the link in the response** and show it to the owner to copy (note as a follow-up to wire
  real email). Don't block the feature on email infra.

### `GET /api/practice/invite/[token]` (public)
Validate token: exists, `pending`, not expired. Return `{ practiceName, email }` for the accept page,
or 404/410 if invalid/expired.

### Accept flow — invited signup
`/invite/[token]` page: shows "Join {practiceName}", pre-fills the invited email, collects name +
password (+ license/specialization). On submit → `POST /api/auth/register` **with the token**.

**`register/route.js` must branch** (today it always creates a new practice):
```js
// if body.inviteToken present and valid:
//   - validate invitation (pending, not expired, email matches)
//   - re-check seats (count active clinicians < practice.seats) — else 409
//   - create user with practiceId = invitation.practiceId, role "counselor"
//   - mark invitation accepted
// else (no token): existing behavior — create a practice-of-one, user is its owner
```
> Seat re-check at accept time matters: seats could have filled between invite and accept.

## Part 3 — Reassignment

### `PATCH /api/clients/[id]/assign` 
Body `{ counselorId: newClinicianId }`. Guards:
- Caller must be able to act on this client: **owner** (any client in practice) **or** the
  **current assigned clinician** (`client.counselorId === user.id`). Else 403.
- `newClinicianId` must be a user in the **same practice**. Else 400.
- Set `client.counselorId = newClinicianId`; save.
- **Audit:** `logAuditEvent({ userId: user.id, action: "update", entityType: "client",
  entityId: client._id, practiceId, details: { reassignedFrom, reassignedTo } })`.
- After transfer, the previous clinician no longer matches the visibility filter → access gone
  (that's the "transfer not share" rule, enforced automatically by Part 1).

### UI
On the client page (owner, or the assigned clinician): a "Reassign" control — a `Select` of
clinicians in the practice → confirm → PATCH → toast "Client reassigned to {name}." For a clinician
reassigning their own client away, warn that they'll lose access ("This hands the client to {name};
you'll no longer see this record."). Owner sees the control on every client; a clinician only on
their own.

## Part 4 — Team management screen (owner)

Repurpose the existing `src/app/admin/` + `src/app/components/users/*` (currently generic user CRUD)
into a practice **Team** page at `/team` (owner only; non-owners get redirected/he 403 view):
- List clinicians in the practice (name, email, # assigned clients, status).
- "Invite clinician" → email input → POST invite → show the invite link/sent state. Disabled with a
  hint when seats are full.
- Seat usage indicator: "3 of 3 seats used — manage in Billing."
- Remove a clinician (owner only): block if they still have assigned clients (force reassignment
  first — "Reassign their N clients before removing"). On remove, soft-handle: set the user inactive
  or detach from practice (don't hard-delete a user with audit history). Decide: simplest is set
  `user.practiceId = null` + mark inactive; their past authored reports/audit stay intact.

> If the old `/users` and `/admin` pages were generic single-user CRUD from the pre-practice era,
> replace them with `/team` rather than keeping both. Grep for links to `/users` / `/admin` and
> repoint to `/team`. Delete the dead generic user CRUD if `/team` supersedes it.

## Part 5 — Seat enforcement (the integrity rule)

Active clinicians ≤ `practice.seats`. Enforced at the two entry points (invite create + invite
accept, Part 2). Also surface it: the Team page shows usage; Billing (Round 7.2 seat picker) is where
they buy more. If a practice somehow exceeds seats (e.g. downgraded), don't lock people out
mid-session — just block *new* invites until they're back within seats, and show a banner. Don't build
auto-deprovisioning.

## Acceptance criteria

1. **Visibility:** clinician B cannot see or GET-by-id clinician A's clients (404); owner sees all.
   Server-enforced (test the API directly, not just the UI).
2. **Invite:** owner invites by email (within seats) → invite link works → invitee registers and
   lands in the **same practice** as a clinician (shares nothing except being in the practice; sees
   only clients later assigned to them). Inviting beyond seats is blocked with the seat message.
3. **Reassign:** an assigned clinician hands their client to a colleague → loses access, colleague
   gains it; audit entry recorded. A clinician cannot reassign a client that isn't theirs (403).
   Owner can reassign any.
4. **Management:** only the owner sees `/team`, can invite/remove, and manages seats. A clinician
   hitting `/team` or the invite API is blocked.
5. **Seats:** can't invite/accept past `practice.seats`; Team page shows accurate usage.
6. `npm run lint` clean; `npm run build` succeeds.

## Suggested commits

```
feat(cognicare): assignment-based client visibility (clinician sees own; owner sees all)
feat(cognicare): practice invitations — model, invite/accept API, invited-signup branch
feat(cognicare): client reassignment with transfer semantics + audit
feat(cognicare): /team management screen (owner) — invite, seats, remove
feat(cognicare): enforce active clinicians <= paid seats
refactor(cognicare): replace generic /users+/admin CRUD with practice /team
```

## Real test: the owner's practice

After this: the owner is the practice owner; she invites her two colleagues (needs Practice plan with
3 seats — Round 7.2). Each colleague registers via invite, sees only their own assigned clients, and
cases can be handed between them. That's the full multi-clinician flow live on synthetic data.

## Honest scope notes

- **Email:** if no transactional email is wired, invites return a copyable link (works fine for her
  3-person practice). Wiring real email (Resend/SES) is a small follow-up, not a blocker.
- **Co-therapy / shared cases:** intentionally not built — transfer-only per the decision. If her
  practice later needs two clinicians on one client, that's a future model change (`counselorIds[]`),
  not this round.
- **Remove-clinician edge cases:** keep it simple (block removal until their clients are reassigned).
  Don't build bulk-reassign-on-remove unless she asks.
