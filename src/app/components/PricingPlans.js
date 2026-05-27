"use client";

import { useState } from "react";
import { plans } from "@/config/plans";

// Public landing pricing — renders the two real paid plans (Solo, Practice)
// from config/plans so the marketing numbers can't drift from /billing.
// 14-day trial is part of each plan's signup flow (Stripe Checkout
// trial_period_days), not a separate "tier".
export default function PricingPlans({
  onGetStarted,
  onUpgrade,
  upgrading = false,
}) {
  const [error, setError] = useState(null);
  const planList = [plans.solo, plans.practice];

  const handleClick = async () => {
    setError(null);
    try {
      if (typeof onGetStarted === "function") {
        await onGetStarted();
      } else if (typeof onUpgrade === "function") {
        await onUpgrade();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {error && (
        <div className="md:col-span-2">
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      )}

      {planList.map((plan) => (
        <div
          key={plan.id}
          className={`relative p-6 rounded-2xl border bg-white hover:shadow-lg transition-shadow ${
            plan.popular ? "border-primary ring-1 ring-primary/20" : "border-border"
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
              Most popular
            </div>
          )}
          <h3 className="text-xl font-semibold mb-2 text-gray-900">{plan.name}</h3>
          <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
          <div className="text-4xl font-bold text-primary mb-4">
            ${plan.price}
            <span className="text-base font-normal text-gray-500">/{plan.duration}</span>
          </div>
          <p className="text-xs text-gray-500 mb-6">14-day free trial. Cancel anytime.</p>
          <ul className="space-y-3 mb-8">
            {plan.features.map((feature) => (
              <li key={feature.id} className="flex items-start text-sm text-gray-700">
                <svg
                  className="w-5 h-5 text-primary mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>{feature.name}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={handleClick}
            disabled={upgrading}
            className="block w-full text-center bg-primary text-primary-foreground py-3 rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {upgrading ? "Processing…" : plan.cta}
          </button>
        </div>
      ))}
    </div>
  );
}
