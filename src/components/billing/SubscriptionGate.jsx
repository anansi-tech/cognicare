"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

// Paths that an authed user without an active subscription is allowed to see —
// the marketing landing, auth pages, the billing page itself, and the client-portal
// (which is for end-clients, not the counselor).
const ALLOW = ["/", "/login", "/signup", "/billing", "/client-portal", "/forgot-password"];

const ACTIVE = new Set(["trialing", "active", "past_due"]);

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
    const subStatus = session?.user?.stripeSubscriptionStatus;
    if (!ACTIVE.has(subStatus)) {
      router.replace("/billing");
    }
  }, [status, session?.user?.stripeSubscriptionStatus, pathname, router]);

  return children;
}
