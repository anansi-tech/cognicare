"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null); // { email, practiceName }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`/api/practice/invite/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invitation could not be found");
        } else {
          setInfo(data);
        }
      } catch {
        setError("Could not load invitation");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const licenseNumber = formData.get("licenseNumber");
    const specialization = formData.get("specialization");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: info.email,
          password,
          name,
          licenseNumber,
          specialization,
          inviteToken: token,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not complete signup");
      router.push("/login?registered=true");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-gray-500">
        Loading invitation…
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invitation unavailable</h1>
          <p className="mt-3 text-sm text-gray-600">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-block text-primary hover:text-primary/80"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <Brand className="text-3xl font-bold" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">Join {info.practiceName}</h2>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;ve been invited as <span className="font-medium">{info.email}</span>.
            Finish creating your account to start collaborating.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="name"
            type="text"
            required
            placeholder="Full Name"
            className="appearance-none rounded-md block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          />
          <input
            name="licenseNumber"
            type="text"
            placeholder="Professional License Number (optional)"
            className="appearance-none rounded-md block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          />
          <input
            name="specialization"
            type="text"
            placeholder="Specialization (optional)"
            className="appearance-none rounded-md block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          />
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Password"
            className="appearance-none rounded-md block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          />
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Confirm Password"
            className="appearance-none rounded-md block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-ring focus:border-primary sm:text-sm"
          />
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-md">{error}</div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating account…" : "Accept invitation"}
          </button>
        </form>
        <p className="text-center text-xs text-gray-500">
          Already have a CogniCare account?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
