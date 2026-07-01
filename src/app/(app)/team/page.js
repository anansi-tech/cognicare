"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Spinner } from "@/components/ui/Spinner";
import { avatarColors, initials } from "@/lib/avatar";

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
    if (!confirm(`Remove ${clinician.name} from the practice? They will lose access immediately.`)) {
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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size={40} />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{error}</div>;
  }

  if (!isOwner) {
    return (
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>Team</p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          Team
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Only the practice owner can manage team members. If you need a colleague added,
          ask your practice owner.
        </p>
      </div>
    );
  }

  const hasCapacity = seats?.hasCapacity ?? false;
  const overCap = seats && seats.used > seats.seats;

  const CARD_STYLE = {
    background: "#fff",
    border: "1px solid #E3ECF7",
    borderRadius: 20,
    padding: "22px 24px",
    boxShadow: "0 22px 50px -40px rgba(11,43,107,.3)",
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
            Team
          </p>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
            Your practice
          </h1>
        </div>
        {seats && (
          <div style={{ fontSize: 13.5, color: "#55698F" }}>
            <span style={{ fontWeight: 600, color: overCap ? "#C0392B" : "#0B2B6B" }}>
              {seats.used} of {seats.seats}
            </span>{" "}
            seats used —{" "}
            <Link href="/billing" className="text-primary hover:text-primary/80 underline">
              manage in Billing
            </Link>
          </div>
        )}
      </div>

      {overCap && (
        <div style={{ marginBottom: 20, borderRadius: 14, border: "1px solid #FECACA", background: "#FEF2F2", padding: "14px 18px", fontSize: 13.5, color: "#B91C1C" }}>
          <strong>Over capacity:</strong> the practice currently has {seats.used} active
          clinicians / pending invites against {seats.seats} paid seats. Existing access is
          preserved, but new invitations are blocked until you{" "}
          <Link href="/billing" className="underline">add seats</Link> or remove members.
        </div>
      )}

      <div className="flex flex-col gap-5">
        {/* Invite form */}
        <div style={CARD_STYLE}>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: 0, color: "#0B2B6B" }}>
            Invite a clinician
          </h2>
          <form className="mt-4 flex items-center gap-3" onSubmit={sendInvite}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              style={{ flex: 1, border: "1px solid #DCE6F3", borderRadius: 10, padding: "9px 13px", fontSize: 14, fontFamily: "inherit", color: "#0B2B6B", outline: "none" }}
            />
            <button
              type="submit"
              disabled={inviting || !hasCapacity}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
              title={!hasCapacity ? "Seats are full — add seats in Billing first." : undefined}
            >
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </form>
          {!hasCapacity && (
            <p className="mt-2 text-xs text-amber-700">
              Seats are full.{" "}
              <Link href="/billing" className="underline">Add seats in Billing</Link> to invite more.
            </p>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div style={CARD_STYLE}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: 0, color: "#0B2B6B" }}>
              Pending invitations
            </h2>
            <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
              {invites.map((inv, idx) => (
                <li
                  key={inv._id}
                  style={{
                    padding: "12px 0",
                    borderTop: idx > 0 ? "1px solid #E3ECF7" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0B2B6B", margin: 0 }}>{inv.email}</p>
                    <p style={{ fontSize: 12.5, color: "#8298BC", margin: "2px 0 0" }}>
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyInviteLink(inv.link)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#DCE6F3] px-2.5 py-1.5 text-xs text-[#55698F] hover:bg-[#F2F7FD] transition-colors"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" /> Copy link
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeInvite(inv.token)}
                      className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 transition-colors"
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
        <div style={CARD_STYLE}>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: 0, color: "#0B2B6B" }}>
            Clinicians
          </h2>
          <ul style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>
            {clinicians.map((c, idx) => (
              <li
                key={c._id}
                style={{
                  padding: "12px 0",
                  borderTop: idx > 0 ? "1px solid #E3ECF7" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {(() => {
                    const [bg, color] = avatarColors(c.name);
                    return (
                      <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: "50%", background: bg, color, fontWeight: 700, fontSize: 12.5, flexShrink: 0 }}>
                        {initials(c.name)}
                      </span>
                    );
                  })()}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0B2B6B", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      {c.name}
                      {c.isOwner && (
                        <span style={{ display: "inline-flex", alignItems: "center", background: "#EAF3FF", color: "#2F80FF", fontWeight: 700, fontSize: 11, padding: "2px 9px", borderRadius: 999 }}>
                          Owner
                        </span>
                      )}
                    </p>
                    <p style={{ fontSize: 12.5, color: "#8298BC", margin: "2px 0 0" }}>
                      {c.email} · {c.assignedClientCount} assigned client{c.assignedClientCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {!c.isOwner && (
                  <button
                    type="button"
                    onClick={() => removeClinician(c)}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-700 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
