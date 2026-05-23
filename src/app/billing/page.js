"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    id: "solo",
    name: "Solo",
    price: "$99",
    cadence: "/mo",
    blurb: "For independent therapists. 14-day free trial.",
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO,
    features: [
      "Unlimited clients",
      "AI assessment + diagnostic + treatment + progress + notes",
      "LIAM in-session copilot",
      "PHQ-9 / GAD-7 capture + trends",
    ],
  },
  {
    id: "practice",
    name: "Practice",
    price: "$89",
    cadence: "/mo/seat",
    blurb: "For multi-clinician practices. Annual billing available.",
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRACTICE,
    features: [
      "Everything in Solo",
      "Per-seat billing",
      "Shared client roster (coming soon)",
    ],
  },
];

const STATUS_LABEL = {
  trialing: "Trial active",
  active: "Active",
  past_due: "Past due — please update your payment method",
  canceled: "Canceled",
  unpaid: "Unpaid",
  incomplete: "Incomplete — finish checkout",
};

const ACTIVE = new Set(["trialing", "active", "past_due"]);

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(null); // priceId currently checking out / "portal"

  if (status === "loading") {
    return <div className="p-6">Loading…</div>;
  }
  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  const subStatus = session?.user?.stripeSubscriptionStatus;
  const isActive = ACTIVE.has(subStatus);

  const subscribe = async (priceId) => {
    if (!priceId) {
      alert(
        "This plan's price isn't configured. Set NEXT_PUBLIC_STRIPE_PRICE_SOLO / _PRACTICE."
      );
      return;
    }
    try {
      setBusy(priceId);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      alert(e.message);
      setBusy(null);
    }
  };

  const openPortal = async () => {
    try {
      setBusy("portal");
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not open portal");
      window.location.href = data.url;
    } catch (e) {
      alert(e.message);
      setBusy(null);
    }
  };

  return (
    <div className="py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        {isActive ? (
          <p className="mt-2 text-sm text-gray-600">
            {STATUS_LABEL[subStatus] ?? subStatus}. Manage your plan, payment method, and
            cancellation in the Stripe portal.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            Choose a plan to start your 14-day free trial. No charge until day 15; cancel anytime.
          </p>
        )}
      </div>

      {isActive ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-700">Subscription status</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            {STATUS_LABEL[subStatus] ?? subStatus}
          </p>
          <button
            onClick={openPortal}
            disabled={busy === "portal"}
            className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm flex flex-col"
            >
              <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {plan.price}
                <span className="text-base font-normal text-gray-500">{plan.cadence}</span>
              </p>
              <p className="mt-2 text-sm text-gray-600">{plan.blurb}</p>
              <ul className="mt-4 space-y-1 text-sm text-gray-700">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <button
                  onClick={() => subscribe(plan.priceEnv)}
                  disabled={busy === plan.priceEnv}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {busy === plan.priceEnv ? "Redirecting…" : `Subscribe to ${plan.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
