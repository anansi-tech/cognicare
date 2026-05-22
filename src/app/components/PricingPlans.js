"use client";

import { useState } from "react";
import Link from "next/link";
import { plans } from "@/config/plans";

export default function PricingPlans({
  subscription,
  onUpgrade,
  upgrading = false,
  showUpgradeButton = true,
  showGetStartedButton = false,
  onGetStarted,
}) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const trialPlan = plans.trial;
  const paidPlan = plans.paid;

  const handleUpgrade = async () => {
    try {
      setError(null);
      setSuccess(false);
      await onUpgrade();
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGetStarted = async () => {
    try {
      setError(null);
      setSuccess(false);
      await onGetStarted();
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Error Message */}
      {error && (
        <div className="col-span-2">
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="col-span-2">
          <div
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <span className="block sm:inline">Subscription upgrade initiated successfully!</span>
          </div>
        </div>
      )}

      <div
        className={`p-6 rounded-2xl border ${
          subscription?.status === "trial" ? "border-indigo-600 bg-indigo-50" : "border-gray-200"
        } hover:shadow-lg transition-shadow`}
      >
        <h3 className="text-xl font-semibold mb-4">{trialPlan.name}</h3>
        {subscription?.status === "trial" && (
          <div className="mb-4 p-2 bg-indigo-100 text-indigo-800 rounded text-sm">
            Your Current Plan
          </div>
        )}
        <div className="text-4xl font-bold text-indigo-600 mb-6">
          ${trialPlan.price}
          <span className="text-lg text-gray-500">/{trialPlan.duration}</span>
        </div>
        <p className="text-gray-600 mb-6">{trialPlan.description}</p>
        <ul className="space-y-4 mb-8">
          {trialPlan.features.map((feature) => (
            <li key={feature.id} className="flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
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
              <span>
                {feature.name}
                {feature.value && `: ${feature.value}`}
              </span>
            </li>
          ))}
        </ul>
        {showGetStartedButton && (
          <button
            onClick={handleGetStarted}
            disabled={upgrading}
            className="block w-full text-center bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-full font-medium hover:from-indigo-700 hover:to-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {upgrading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              trialPlan.cta
            )}
          </button>
        )}
      </div>

      <div
        className={`p-6 rounded-2xl ${
          subscription?.status === "active"
            ? "border-2 border-indigo-600 bg-indigo-50"
            : "border-2 border-indigo-600 bg-indigo-50"
        } transform scale-105`}
      >
        {paidPlan.popular && (
          <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-1 rounded-bl-lg text-sm font-medium">
            Most Popular
          </div>
        )}
        {subscription?.status === "active" && (
          <div className="mb-4 p-2 bg-indigo-100 text-indigo-800 rounded text-sm">
            Your Current Plan
          </div>
        )}
        {subscription?.status === "cancelled" && (
          <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
            Subscription Cancelled
          </div>
        )}
        {subscription?.status === "past_due" && (
          <div className="mb-4 p-2 bg-red-100 text-red-800 rounded text-sm">Payment Failed</div>
        )}
        <h3 className="text-xl font-semibold mb-4">{paidPlan.name}</h3>
        <div className="text-4xl font-bold text-indigo-600 mb-6">
          ${paidPlan.price}
          <span className="text-lg text-gray-500">/{paidPlan.duration}</span>
        </div>
        <p className="text-gray-600 mb-6">{paidPlan.description}</p>
        <ul className="space-y-4 mb-8">
          {paidPlan.features.map((feature) => (
            <li key={feature.id} className="flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
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
              <span>
                {feature.name}
                {feature.value && `: ${feature.value}`}
              </span>
            </li>
          ))}
        </ul>
        {showUpgradeButton &&
          (subscription?.status === "trial" ||
            subscription?.status === "cancelled" ||
            subscription?.status === "past_due") && (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="block w-full text-center bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-full font-medium hover:from-indigo-700 hover:to-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {upgrading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : subscription?.status === "cancelled" ? (
                "Resubscribe"
              ) : subscription?.status === "past_due" ? (
                "Update Payment"
              ) : (
                paidPlan.cta
              )}
            </button>
          )}
      </div>
    </div>
  );
}
