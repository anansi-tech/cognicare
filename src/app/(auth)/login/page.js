"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Brand } from "@/components/Brand";

const PERKS = [
  "Access your AI clinical team",
  "Track client progress over time",
  "Ask LIAM, grounded in the record",
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  if (status === "authenticated") return null;
  const registered = searchParams.get("registered") === "true";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const friendly =
          result.error === "CredentialsSignin"
            ? "Incorrect email or password."
            : "Something went wrong. Please try again.";
        setError(friendly);
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (err) {
      setError("An error occurred during login");
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
        <div aria-hidden="true" style={{ position: "absolute", bottom: -120, left: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,185,200,.26), transparent 66%)" }} />
        <div style={{ position: "relative", maxWidth: 420, padding: "64px 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 11, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)" }}>
              <svg width="21" height="21" viewBox="0 0 512 512" fill="none">
                <path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" stroke="#54C8D6" strokeWidth="48" strokeLinecap="round" />
              </svg>
            </span>
            <Brand variant="onPrimary" className="text-[21px] font-bold" />
          </div>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 42, lineHeight: 1.05, letterSpacing: "-.03em", margin: "36px 0 0", color: "#fff" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "#B7CBE8", margin: "16px 0 0" }}>
            Sign in to your AI clinical team and pick up right where you and your clients left off.
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
      <div className="w-full lg:w-1/2 flex items-center justify-center py-14 px-8" style={{ background: "#FCFEFF" }}>
        <div style={{ width: "100%", maxWidth: 392 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <Link href="/" className="inline-block">
              <Brand className="text-[22px] font-bold" />
            </Link>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: "20px 0 0", color: "#0B2B6B" }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: 14.5, color: "#6E83A6", margin: "8px 0 0" }}>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Create an account
              </Link>
            </p>
          </div>

          {registered && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 mb-5">
              Account created. Sign in to continue.
            </div>
          )}

          <form className="space-y-[18px]" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#41557A", marginBottom: 7 }}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-[border-color,box-shadow] duration-150"
                style={{ borderRadius: 12, padding: "12.5px 14px", fontSize: 14.5 }}
                placeholder="you@practice.com"
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, color: "#41557A" }}>
                  Password
                </label>
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
                autoComplete="current-password"
                required
                className="block w-full border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-[border-color,box-shadow] duration-150"
                style={{ borderRadius: 12, padding: "12.5px 14px", fontSize: 14.5 }}
                placeholder="Enter password"
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
              style={{ display: "block", width: "100%", background: "#2F80FF", borderRadius: 12, padding: "13.5px 0", border: "none", cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p style={{ fontSize: 12.5, color: "#9AAFCE", textAlign: "center", margin: "22px 0 0" }}>
            Need help signing in? Email{" "}
            <a href="mailto:cognicare@anansi.xyz" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              cognicare@anansi.xyz
            </a>
          </p>
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
