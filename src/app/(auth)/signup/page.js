"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Brand } from "@/components/Brand";
import { validatePassword } from "@/lib/password";

const PERKS = [
  "Five specialists + LIAM",
  "14-day free trial, no risk",
  "Solo or group practice ready",
];

const INPUT_STYLE = { borderRadius: 12, padding: "12px 14px", fontSize: 14.5 };
const INPUT_CLASS = "block w-full border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-[border-color,box-shadow] duration-150";
const LABEL_STYLE = { display: "block", fontSize: 13, fontWeight: 600, color: "#41557A", marginBottom: 7 };

export default function SignupPage() {
  const router = useRouter();
  const { status } = useSession();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "authenticated") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    const name = formData.get("name");
    const licenseNumber = formData.get("licenseNumber");
    const specialization = formData.get("specialization");
    const practiceName = formData.get("practiceName");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Mirrors the server rule for inline UX; the register route is the authority.
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name,
          licenseNumber,
          specialization,
          practiceName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      router.push("/login?registered=true");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "var(--font-hanken, system-ui, sans-serif)" }}>

      {/* Brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
        style={{ background: "radial-gradient(130% 120% at 30% 0%, #16407f, #0B2B6B 55%, #081f54)" }}
      >
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)", backgroundSize: "26px 26px", maskImage: "radial-gradient(80% 80% at 30% 40%, #000, transparent 75%)" }} />
        <div aria-hidden="true" style={{ position: "absolute", top: -100, right: -90, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(47,128,255,.28), transparent 66%)" }} />
        <div style={{ position: "relative", maxWidth: 430, padding: "64px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)" }}>
              <svg width="21" height="21" viewBox="0 0 512 512" fill="none">
                <path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" stroke="#54C8D6" strokeWidth="48" strokeLinecap="round" />
              </svg>
            </span>
            <Brand variant="onPrimary" className="text-[21px] font-bold" />
          </div>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 42, lineHeight: 1.05, letterSpacing: "-.03em", margin: "36px 0 0", color: "#fff" }}>
            Your AI clinical<br />team, in minutes
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "#B7CBE8", margin: "16px 0 0" }}>
            Five specialists + LIAM — from intake through documentation. Start free with a 14-day trial.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: "30px 0 0", display: "grid", gap: 14 }}>
            {PERKS.map((perk) => (
              <li key={perk} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#DDEBFF" }}>
                <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 999, background: "rgba(84,200,214,.16)", color: "#7FE0EC", fontSize: 13 }}>✓</span>
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-1/2 relative flex items-start justify-center py-10 px-8 overflow-y-auto" style={{ background: "#FCFEFF" }}>
        <Link
          href="/"
          className="absolute top-4 left-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        <div style={{ width: "100%", maxWidth: 412, paddingTop: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <Link href="/" className="inline-block">
              <Brand className="text-[22px] font-bold" />
            </Link>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: "20px 0 0", color: "#0B2B6B" }}>
              Create your account
            </h2>
            <p style={{ fontSize: 14.5, color: "#6E83A6", margin: "8px 0 0" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" style={LABEL_STYLE}>Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                placeholder="Your full name"
              />
            </div>

            <div>
              <label htmlFor="email" style={LABEL_STYLE}>Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                placeholder="you@practice.com"
              />
            </div>

            <div>
              <label htmlFor="practiceName" style={LABEL_STYLE}>
                Practice name <span style={{ color: "#9AAFCE", fontWeight: 500 }}>(optional)</span>
              </label>
              <input
                id="practiceName"
                name="practiceName"
                type="text"
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                placeholder="e.g. Cedar Counseling Group"
              />
              <p style={{ fontSize: 12, color: "#9AAFCE", margin: "6px 0 0" }}>
                Leave blank if you&apos;re a solo practitioner. You can update this later.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="licenseNumber" style={LABEL_STYLE}>
                  License # <span style={{ color: "#9AAFCE", fontWeight: 500 }}>(opt.)</span>
                </label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  className={INPUT_CLASS}
                  style={INPUT_STYLE}
                  placeholder="If available"
                />
              </div>
              <div>
                <label htmlFor="specialization" style={LABEL_STYLE}>
                  Specialization <span style={{ color: "#9AAFCE", fontWeight: 500 }}>(opt.)</span>
                </label>
                <input
                  id="specialization"
                  name="specialization"
                  type="text"
                  className={INPUT_CLASS}
                  style={INPUT_STYLE}
                  placeholder="e.g. Trauma"
                />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, color: "#41557A" }}>Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                placeholder="Create password"
              />
              <p style={{ fontSize: 12, color: "#9AAFCE", margin: "6px 0 0" }}>
                At least 12 characters — a longer passphrase beats symbols.
              </p>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <label htmlFor="confirmPassword" style={{ fontSize: 13, fontWeight: 600, color: "#41557A" }}>Confirm password</label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                placeholder="Confirm password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-semibold text-[15px] text-primary-foreground transition-all duration-200 shadow-[0_16px_40px_-16px_rgba(47,128,255,0.8)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-14px_rgba(47,128,255,0.9)] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_16px_40px_-16px_rgba(47,128,255,0.8)]"
              style={{ display: "block", width: "100%", background: "#2F80FF", borderRadius: 12, padding: "13.5px 0", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 8 }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
