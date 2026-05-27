"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

// Team management screen — owner only. Lists clinicians + pending invites,
// surfaces seat usage, and is where the owner adds/removes members. Non-owners
// are redirected to /dashboard.
export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [clinicians, setClinicians] = useState([]);
  const [invites, setInvites] = useState([]);
  const [seats, setSeats] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const userId = session?.user?.id;
  const isOwner =
    !!session?.user?.isPracticeOwner ||
    (ownerId && userId && String(ownerId) === String(userId));

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
    // Non-owners aren't allowed on /team (HIPAA boundary: roster mgmt is owner-only).
    if (status === "authenticated" && session?.user && session.user.isPracticeOwner === false) {
      router.replace("/dashboard");
    }
  }, [status, session?.user?.isPracticeOwner, router]);

  const refresh = async () => {
    try {
      const [cRes, iRes, sRes] = await Promise.all([
        fetch("/api/practice/clinicians"),
        fetch("/api/practice/invite"),
        fetch("/api/practice/seats"),
      ]);
      const cData = await cRes.json();
      if (cRes.ok && Array.isArray(cData)) {
        setClinicians(cData);
        const owner = cData.find((c) => c.isOwner);
        if (owner) setOwnerId(owner._id);
      }
      if (iRes.ok) setInvites(await iRes.json());
      else setInvites([]);
      if (sRes.ok) setSeats(await sRes.json());
      else if (sRes.status === 403) {
        // Not the owner — bounce.
        router.replace("/dashboard");
        return;
      }
    } catch (e) {
      setError("Could not load team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") refresh();
  }, [status]);

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/practice/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send invitation");
      toast.success("Invitation created.");
      setInviteEmail("");
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (token) => {
    if (!confirm("Revoke this invitation?")) return;
    try {
      const res = await fetch(`/api/practice/invite/${token}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not revoke");
      }
      toast.success("Invitation revoked.");
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeClinician = async (clinician) => {
    if (
      !confirm(
        `Remove ${clinician.name} from the practice? They will lose access immediately.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/practice/clinicians/${clinician._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not remove");
      toast.success(`${clinician.name} removed from practice.`);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const copyInviteLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Copy failed — link: " + link);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  }

  if (error) {
    return <div className="p-8 text-sm text-red-600">{error}</div>;
  }

  if (!isOwner) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="mt-3 text-sm text-gray-600">
          Only the practice owner can manage team members. If you need a colleague added,
          ask your practice owner.
        </p>
      </div>
    );
  }

  const hasCapacity = seats?.hasCapacity ?? false;
  const overCap = seats && seats.used > seats.seats;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-600">
            Invite clinicians to your practice, reassign caseloads, and manage seats.
          </p>
        </div>
        {seats && (
          <div className="text-sm text-gray-700">
            <span className={`font-medium ${overCap ? "text-red-700" : ""}`}>
              {seats.used} of {seats.seats}
            </span>{" "}
            seats used —{" "}
            <Link href="/billing" className="text-primary hover:text-primary/80">
              manage in Billing
            </Link>
          </div>
        )}
      </div>

      {overCap && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Over capacity:</strong> the practice currently has {seats.used} active
          clinicians / pending invites against {seats.seats} paid seats. Existing access is
          preserved, but new invitations are blocked until you{" "}
          <Link href="/billing" className="underline">add seats</Link> or remove members.
        </div>
      )}

      {/* Invite form */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Invite a clinician</h2>
        <form className="mt-3 flex items-center gap-2" onSubmit={sendInvite}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={inviting || !hasCapacity}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            title={!hasCapacity ? "Seats are full — add seats in Billing first." : undefined}
          >
            {inviting ? "Sending…" : "Send invite"}
          </button>
        </form>
        {!hasCapacity && (
          <p className="mt-2 text-xs text-amber-700">
            Seats are full. <Link href="/billing" className="underline">Add seats in Billing</Link> to invite more.
          </p>
        )}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Pending invitations</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {invites.map((inv) => (
              <li key={inv._id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(inv.link)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" /> Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => revokeInvite(inv.token)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clinicians */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Clinicians</h2>
        <ul className="mt-3 divide-y divide-gray-100">
          {clinicians.map((c) => (
            <li key={c._id} className="py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {c.name}
                  {c.isOwner && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-primary">
                      Owner
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {c.email} · {c.assignedClientCount} assigned client
                  {c.assignedClientCount === 1 ? "" : "s"}
                </p>
              </div>
              {!c.isOwner && (
                <button
                  type="button"
                  onClick={() => removeClinician(c)}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
