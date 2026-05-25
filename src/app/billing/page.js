"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const AGENTS = [
  "Assessment — structured intake & risk, automatically on every new client",
  "Diagnostic — DSM-5-TR / ICD-10 differential with the criteria met",
  "Treatment — evidence-based plan with measurable goals",
  "Progress — measurement-based tracking with reliable-change detection",
  "Documentation — SOAP notes drafted for your review and approval",
  "LIAM — in-session copilot that answers from this client's own history",
];

const PLANS = [
  {
    id: "solo",
    name: "Solo",
    price: "$69",
    cadence: "/mo",
    blurb: "For independent therapists. 14-day free trial, cancel anytime.",
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_SOLO,
    highlight: true,
    features: [
      "Your full AI clinical team — all six agents",
      "Unlimited clients & sessions",
      "PHQ-9 / GAD-7 administration with longitudinal trends",
      "Automatic workflow: intake, prep, and notes run themselves",
    ],
  },
  {
    id: "practice",
    name: "Practice",
    price: "$59",
    cadence: "/mo per clinician",
    blurb: "For multi-clinician practices. Everything in Solo, billed per seat.",
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRACTICE,
    highlight: false,
    features: [
      "Everything in Solo, for every clinician",
      "Per-seat pricing as your practice grows",
      "Shared client roster & admin role (coming soon)",
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
  const [seats, setSeats] = useState(2); // Practice plan implies 2+; default 2

  // Unauthed users get bounced to the marketing landing (pricing already
  // lives there). Done in an effect — never call router.replace during render.
  // Also catches the post-signOut window where status hasn't transitioned yet
  // but session.user is already cleared (v5 SessionProvider timing).
  const isAuthed = status === "authenticated" && !!session?.user?.id;
  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.id)) {
      router.replace("/");
    }
  }, [status, session?.user?.id, router]);

  if (!isAuthed) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const subStatus = session?.user?.stripeSubscriptionStatus;
  const isActive = ACTIVE.has(subStatus);

  const subscribe = async (priceId, quantity = 1) => {
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
        body: JSON.stringify({ priceId, quantity }),
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
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        {isActive ? (
          <p className="mt-2 text-sm text-gray-600">
            {STATUS_LABEL[subStatus] ?? subStatus}. Manage your plan, payment method, and
            cancellation in the Stripe portal.
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-600">
            Start a 14-day free trial — your full AI clinical team included. No charge until
            day 15; cancel anytime.
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
        <>
          <div className="mb-8 rounded-lg border border-indigo-100 bg-indigo-50 p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Six AI agents handle the clinical heavy lifting
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              You bring the observations. CogniCare&apos;s AI clinical team does the rest — built
              AI-native, not bolted on. Other platforms charge extra for AI notes alone; here it&apos;s
              one of six agents working together across the whole workflow.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {AGENTS.map((a, i) => {
                const [name, desc] = a.split(" — ");
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 text-indigo-500">▸</span>
                    <span>
                      <span className="font-medium text-gray-900">{name}</span> —{" "}
                      <span className="text-gray-600">{desc}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-lg bg-white p-6 shadow-sm flex flex-col ${
                  plan.highlight
                    ? "border border-indigo-300 ring-1 ring-indigo-100"
                    : "border border-gray-200"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-medium text-white">
                    Most popular
                  </span>
                )}
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
                {plan.id === "practice" && (
                  <div className="mt-4 flex items-center gap-2">
                    <label htmlFor="seats" className="text-sm text-gray-600">
                      Clinicians
                    </label>
                    <input
                      id="seats"
                      type="number"
                      min={2}
                      max={100}
                      value={seats}
                      onChange={(e) =>
                        setSeats(Math.max(2, Math.min(100, Number(e.target.value) || 2)))
                      }
                      className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </div>
                )}
                {plan.id === "practice" && (
                  <p className="mt-2 text-sm text-gray-500">
                    {seats} clinicians × $59 ={" "}
                    <span className="font-medium text-gray-900">${seats * 59}/mo</span>
                  </p>
                )}
                <div className="mt-6">
                  <button
                    onClick={() =>
                      plan.id === "practice"
                        ? subscribe(plan.priceEnv, seats)
                        : subscribe(plan.priceEnv)
                    }
                    disabled={busy === plan.priceEnv}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {busy === plan.priceEnv ? "Redirecting…" : `Subscribe to ${plan.name}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
