"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

// Paths that an authed user without an active subscription is allowed to see —
// the marketing landing, auth pages, the billing page itself, and the client-portal
// (which is for end-clients, not the counselor).
const ALLOW = [
  "/",
  "/login",
  "/signup",
  "/billing",
  "/client-portal",
  "/forgot-password",
  "/invite",
];

const ACTIVE = new Set(["trialing", "active", "past_due"]);

// Dev escape hatch: local builds don't have Stripe webhook forwarding wired up,
// so practice.stripeSubscriptionStatus stays null and the gate would bounce
// every protected route to /billing. Production keeps the real gate.
const IS_DEV = process.env.NODE_ENV !== "production";

function isAllowed(pathname) {
  if (!pathname) return true;
  return ALLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function SubscriptionGate({ children }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (isAllowed(pathname)) return;
    if (IS_DEV) return;
    const subStatus = session?.user?.stripeSubscriptionStatus;
    if (!ACTIVE.has(subStatus)) {
      router.replace("/billing");
    }
  }, [status, session?.user?.stripeSubscriptionStatus, pathname, router]);

  return children;
}
