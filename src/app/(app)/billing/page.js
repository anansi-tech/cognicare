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
  const [busy, setBusy] = useState(null);
  const [seats, setSeats] = useState(2);
  const [selectedPlan, setSelectedPlan] = useState("solo");

  const isAuthed = status === "authenticated" && !!session?.user?.id;
  const isOwner = !!session?.user?.isPracticeOwner;

  useEffect(() => {
    if (status === "unauthenticated" || (status === "authenticated" && !session?.user?.id)) {
      router.replace("/");
    }
  }, [status, session?.user?.id, router]);

  if (!isAuthed) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!isOwner) {
    return (
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
          Billing
        </p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          Subscription
        </h1>
        <p className="mt-3 text-sm text-muted-foreground max-w-prose">
          Your practice&apos;s subscription is managed by the practice owner. If
          something isn&apos;t working (e.g. you&apos;ve been routed here unexpectedly),
          please reach out to them to confirm the subscription is active.
        </p>
      </div>
    );
  }

  const subStatus = session?.user?.stripeSubscriptionStatus;
  const isActive = ACTIVE.has(subStatus);

  const subscribe = async (priceId, quantity = 1) => {
    if (!priceId) {
      alert("This plan's price isn't configured. Set NEXT_PUBLIC_STRIPE_PRICE_SOLO / _PRACTICE.");
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
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 26 }}>
        <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
          Billing
        </p>
        <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
          Subscription
        </h1>
        <p style={{ fontSize: 15.5, color: "#55698F", margin: "6px 0 0" }}>
          {isActive
            ? `${STATUS_LABEL[subStatus] ?? subStatus}. Manage your plan, payment method, and cancellation in the Stripe portal.`
            : "Start a 14-day free trial — your full AI clinical team included. No charge until day 15; cancel anytime."}
        </p>
      </div>

      {isActive ? (
        <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, padding: 28, boxShadow: "0 22px 50px -40px rgba(11,43,107,.35)" }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#8298BC", margin: 0 }}>Subscription status</p>
          <p style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 24, color: "#0B2B6B", margin: "6px 0 0" }}>
            {STATUS_LABEL[subStatus] ?? subStatus}
          </p>
          <button
            onClick={openPortal}
            disabled={busy === "portal"}
            className="mt-5 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>
        </div>
      ) : (
        <>
          {/* Agents value card */}
          <div style={{ background: "#F2F7FD", border: "1px solid #E3ECF7", borderRadius: 20, padding: 28, marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, letterSpacing: "-.015em", margin: 0, color: "#0B2B6B" }}>
              Six AI agents handle the clinical heavy lifting
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#55698F", margin: "8px 0 0", maxWidth: 720 }}>
              You bring the observations. CogniCare&apos;s AI clinical team does the rest — built
              AI-native, not bolted on. Other platforms charge extra for AI notes alone; here it&apos;s
              one of six agents working together across the whole workflow.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-5">
              {AGENTS.map((a, i) => {
                const [name, desc] = a.split(" — ");
                return (
                  <div key={i} className="flex gap-[11px] items-start">
                    <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 999, background: "#EAF3FF", color: "#2F80FF", fontSize: 12, fontWeight: 800 }}>✓</span>
                    <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "#2C3E5E" }}>
                      <span style={{ fontWeight: 700, color: "#0B2B6B" }}>{name}</span> — {desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative flex flex-col cursor-pointer transition-[border-color,box-shadow] duration-[180ms] ${
                  selectedPlan === plan.id
                    ? "ring-4 ring-primary/10"
                    : ""
                }`}
                style={{
                  background: "#fff",
                  border: selectedPlan === plan.id ? "1.5px solid #2F80FF" : "1px solid #E3ECF7",
                  borderRadius: 20,
                  padding: 28,
                  boxShadow: selectedPlan === plan.id
                    ? "0 26px 56px -38px rgba(11,43,107,.4)"
                    : "0 22px 50px -40px rgba(11,43,107,.35)",
                }}
              >
                {plan.highlight && (
                  <span style={{ position: "absolute", top: -12, left: 24, background: "#2F80FF", color: "#fff", fontWeight: 700, fontSize: 11, letterSpacing: ".02em", padding: "4px 12px", borderRadius: 999 }}>
                    MOST POPULAR
                  </span>
                )}
                <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 20, margin: "4px 0 0", color: "#0B2B6B" }}>
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-[3px] mt-3">
                  <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 800, fontSize: 40, color: "#0B2B6B", letterSpacing: "-.02em" }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 15, color: "#8298BC" }}>{plan.cadence}</span>
                </div>
                <p style={{ fontSize: 13.5, color: "#55698F", margin: "8px 0 0" }}>{plan.blurb}</p>
                <div className="grid gap-[10px] mt-5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex gap-[10px]" style={{ fontSize: 13.5, color: "#41557A" }}>
                      <span style={{ color: plan.highlight ? "#2F80FF" : "#158A98", fontWeight: 800 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                {plan.id === "practice" && (
                  <div className="flex items-center gap-[10px] mt-[18px]">
                    <label htmlFor="seats" style={{ fontSize: 13.5, color: "#55698F" }}>Clinicians</label>
                    <input
                      id="seats"
                      type="number"
                      min={2}
                      max={100}
                      value={seats}
                      onChange={(e) => setSeats(Math.max(2, Math.min(100, Number(e.target.value) || 2)))}
                      style={{ width: 66, border: "1px solid #DCE6F3", borderRadius: 9, padding: "7px 10px", fontSize: 14, fontFamily: "inherit", color: "#0B2B6B", outline: "none" }}
                    />
                    <span style={{ fontSize: 13, color: "#8298BC" }}>
                      {seats} × $59 = <span style={{ fontWeight: 700, color: "#0B2B6B" }}>${seats * 59}/mo</span>
                    </span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    plan.id === "practice" ? subscribe(plan.priceEnv, seats) : subscribe(plan.priceEnv);
                  }}
                  disabled={busy === plan.priceEnv}
                  className={`mt-6 w-full rounded-xl py-[13px] text-[14.5px] font-bold transition-all duration-[180ms] disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground shadow-[0_16px_40px_-16px_rgba(47,128,255,0.8)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-14px_rgba(47,128,255,0.9)]"
                      : "bg-[#EAF3FF] text-primary border border-[#DCE6F3] hover:-translate-y-0.5"
                  }`}
                >
                  {busy === plan.priceEnv ? "Redirecting…" : `Subscribe to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
