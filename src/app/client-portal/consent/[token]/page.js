"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ConsentMarkdown } from "@/components/ai/ConsentMarkdown";
import { PRACTICE_TZ } from "@/lib/timezone";

// Public consent portal — opened from the link sent to the client. Token in
// the URL is the only authorization (no account / no session). Mobile-first:
// big tap targets, plain language, readable text.
export default function ConsentPortalPage() {
  const { token } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typedName, setTypedName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/consent-forms/${token}?token=true`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Consent link is invalid or expired.");
        } else {
          setForm(data);
        }
      } catch {
        setError("Could not load consent form.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const isMinor = form?.type === "minor";
  const nameLabel = isMinor ? "Parent / guardian full name" : "Your full name";

  const canSubmit = useMemo(() => {
    if (!typedName.trim() || !agreed || submitting) return false;
    if (isMinor && !guardianRelationship.trim()) return false;
    return true;
  }, [typedName, agreed, isMinor, guardianRelationship, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/consent-forms/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          typedName: typedName.trim(),
          agreed: true,
          guardianRelationship: isMinor ? guardianRelationship.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record signature");
      // Re-fetch in signed state for confirmation + download link. The form's
      // _id is what the GET-by-signed path expects when the token is cleared.
      const followup = await fetch(`/api/consent-forms/${data.formId}?token=true`);
      if (followup.ok) setForm(await followup.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading…</div>;
  }
  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Link unavailable</h1>
          <p className="mt-3 text-sm text-gray-600">{error}</p>
          <p className="mt-4 text-xs text-gray-500">
            Please contact your counselor to request a new consent link.
          </p>
        </div>
      </div>
    );
  }
  if (!form) return null;

  const signed = form.status === "signed";
  const downloadUrl = form.signedDocumentUrl || form.documentUrl;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-5 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {form.title || "Consent Form"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Version {form.version}
            {" · "}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                signed
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {signed ? "Signed" : "Awaiting signature"}
            </span>
          </p>
        </div>

        {form.body && (
          <div className="mb-6 max-h-[55vh] overflow-y-auto rounded border border-gray-200 bg-gray-50 p-4 text-gray-800">
            <ConsentMarkdown content={form.body} />
          </div>
        )}

        {signed ? (
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-800">
              Thank you. This form was electronically signed on{" "}
              <span className="font-medium">
                {form.dateSigned ? new Date(form.dateSigned).toLocaleString("en-US", { timeZone: PRACTICE_TZ }) : "—"}
              </span>
              .
            </p>
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary/90"
              >
                Download signed copy
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="typedName"
                className="block text-sm font-medium text-gray-700"
              >
                {nameLabel}
              </label>
              <input
                id="typedName"
                type="text"
                autoComplete="name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                placeholder={isMinor ? "e.g. Jane Doe" : "Type your full legal name"}
                required
              />
            </div>

            {isMinor && (
              <div>
                <label
                  htmlFor="relationship"
                  className="block text-sm font-medium text-gray-700"
                >
                  Relationship to minor
                </label>
                <input
                  id="relationship"
                  type="text"
                  value={guardianRelationship}
                  onChange={(e) => setGuardianRelationship(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                  placeholder="e.g. Mother, Father, Legal guardian"
                  required
                />
              </div>
            )}

            <label className="flex items-start gap-3 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-primary focus:ring-ring"
                required
              />
              <span>
                I have read and agree to this consent form. I understand that
                typing my name above constitutes a legally binding electronic
                signature under the US ESIGN Act.
              </span>
            </label>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full inline-flex justify-center items-center px-4 py-3 rounded-md text-base font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing…" : "Sign electronically"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
