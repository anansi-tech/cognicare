import Link from "next/link";

export default function ContactPage() {
  return (
    <div style={{ fontFamily: "var(--font-hanken, system-ui, sans-serif)", color: "#0B2B6B", background: "#FCFEFF" }}>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(120% 130% at 78% -30%, #16407f, #0B2B6B 52%, #081f54)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)", backgroundSize: "26px 26px", maskImage: "linear-gradient(to bottom, #000, transparent 85%)" }} />
        <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto", padding: "72px 28px 120px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, color: "#BFE6EC", letterSpacing: ".04em" }}>
            CONTACT
          </div>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: "clamp(36px, 5vw, 50px)", lineHeight: 1.04, letterSpacing: "-.03em", margin: "18px 0 0", color: "#fff" }}>
            Let&apos;s talk
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: 1.55, color: "#B7CBE8", margin: "14px 0 0", maxWidth: 520 }}>
            Questions about CogniCare, demos for your group practice, or help getting set up — we usually reply within a business day.
          </p>
        </div>
      </section>

      {/* Contact cards — pulls up over hero */}
      <section style={{ maxWidth: 1080, margin: "-80px auto 0", padding: "0 28px 90px", position: "relative" }}>

        {/* Crisis/safety alert */}
        <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 16, padding: "18px 20px", boxShadow: "0 4px 16px -6px rgba(180,130,0,.15)" }}>
          <svg style={{ flexShrink: 0, marginTop: 1 }} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#B45309" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "#78350F", margin: 0 }}>
            <strong>CogniCare support is not an emergency service.</strong> If you or someone else is in immediate danger, call <strong>911</strong>. For 24/7 emotional crisis support in the U.S., call or text <strong>988</strong>.
          </p>
        </div>

        {/* Email + Address cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="mailto:cognicare@anansi.xyz"
            className="border border-[#E3ECF7] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_50px_-38px_rgba(11,43,107,0.4)] hover:border-[#C7DCF5]"
            style={{ display: "block", background: "#fff", borderRadius: 18, padding: 22, boxShadow: "0 22px 50px -38px rgba(11,43,107,.25)", textDecoration: "none" }}
          >
            <div style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 13, background: "#EAF3FF" }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2F80FF" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, margin: "14px 0 0", color: "#0B2B6B" }}>Email us</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#54678A", margin: "5px 0 0" }}>For general questions and support. Drop us a line anytime.</p>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#2F80FF", marginTop: 8 }}>cognicare@anansi.xyz</div>
          </a>

          <div
            style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: 22, boxShadow: "0 22px 50px -38px rgba(11,43,107,.25)" }}
          >
            <div style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 13, background: "#E2F4F2" }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#158A98" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, margin: "14px 0 0", color: "#0B2B6B" }}>Mailing address</h3>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "#54678A", margin: "5px 0 0" }}>
              1000 Brickell Ave, Ste 715<br />
              PMB 2209<br />
              Miami, FL 33131
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "#F2F7FD", borderTop: "1px solid #E7EFF9" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "76px 28px 90px" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>FAQ</p>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: "clamp(24px, 2.5vw, 32px)", letterSpacing: "-.02em", margin: "12px 0 0", color: "#0B2B6B" }}>Frequently asked questions</h2>
            <p style={{ fontSize: 16, color: "#54678A", margin: "10px auto 0", maxWidth: 480 }}>
              A few common questions to get you started. Don&apos;t see your answer? Reach out by email.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: "24px 22px", boxShadow: "0 6px 24px -16px rgba(11,43,107,.2)" }}>
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, margin: 0, color: "#0B2B6B" }}>How do I get started?</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#54678A", margin: "8px 0 0" }}>
                Sign up for an account and follow the interactive onboarding flow. You&apos;ll be up and running in just a few minutes.
              </p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: "24px 22px", boxShadow: "0 6px 24px -16px rgba(11,43,107,.2)" }}>
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, margin: 0, color: "#0B2B6B" }}>What are your pricing plans?</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#54678A", margin: "8px 0 0" }}>
                We offer a <strong style={{ color: "#2C3E5E" }}>Solo</strong> plan at $69/mo for independent therapists, and a <strong style={{ color: "#2C3E5E" }}>Practice</strong> plan at $59/mo per clinician for groups. Both include a 14-day free trial.
              </p>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: "24px 22px", boxShadow: "0 6px 24px -16px rgba(11,43,107,.2)" }}>
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, margin: 0, color: "#0B2B6B" }}>Is my data secure?</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#54678A", margin: "8px 0 0" }}>
                We enforce practice-scoped access controls, encryption-ready storage, and full audit logs. HIPAA / BAA coverage is rolling out before clinical use (synthetic data only until then).
              </p>
              <Link href="/about" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 14, fontWeight: 600, color: "#2F80FF", textDecoration: "none" }}>
                See security overview
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 18, padding: "24px 22px", boxShadow: "0 6px 24px -16px rgba(11,43,107,.2)" }}>
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 16, margin: 0, color: "#0B2B6B" }}>Do you offer live support?</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "#54678A", margin: "8px 0 0" }}>
                Yes, we offer both email and in-app support. Send us a note at the address above and our team will get back to you promptly.
              </p>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
