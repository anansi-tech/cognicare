import Link from "next/link";

const HELP_CARDS = [
  {
    title: "AI-Powered Analysis",
    desc: "Specialized agents turn your observations into structured intake, diagnosis, plans and progress — grounded in each client's record.",
    iconBg: "#EAF3FF",
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#2F80FF" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "Comprehensive Reports",
    desc: "Assessment, diagnostic, treatment, progress and SOAP documentation — drafted for you to review and approve.",
    iconBg: "#E2F4F2",
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#158A98" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Secure by Design",
    desc: "Practice-scoped access control, audit logging and encryption-ready storage. HIPAA & BAA coverage rolling out before clinical use.",
    iconBg: "#E7F6EC",
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#4DBB6A" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

const BENEFITS = [
  "Save hours with automated report generation",
  "Streamline documentation & record-keeping",
  "Gain deeper insights into client progress",
  "Improve client outcomes through better tracking",
  "Enhance treatment planning with data-driven insights",
  "Practice-scoped access & audit logs out of the box",
];

export default function AboutPage() {
  return (
    <div style={{ fontFamily: "var(--font-hanken, system-ui, sans-serif)", color: "#0B2B6B", background: "#FCFEFF" }}>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(120% 110% at 75% -20%, #16407f 0%, #0B2B6B 50%, #081f54 100%)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)", backgroundSize: "26px 26px", maskImage: "linear-gradient(to bottom, #000, transparent 80%)" }} />
        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto", padding: "84px 28px 76px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, color: "#BFE6EC", letterSpacing: ".04em" }}>
            ABOUT COGNICARE
          </div>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: "clamp(36px, 5vw, 52px)", lineHeight: 1.05, letterSpacing: "-.03em", margin: "22px 0 0", color: "#fff" }}>
            Built so clinicians can<br />be <span style={{ color: "#54C8D6" }}>clinicians again</span>
          </h1>
          <p style={{ fontSize: "clamp(16px, 2vw, 19px)", lineHeight: 1.6, color: "#B7CBE8", margin: "22px auto 0", maxWidth: 600 }}>
            We&apos;re the <strong style={{ color: "#fff" }}>Cognitive Care Collective</strong>. Our mission is to give mental-health professionals a specialized AI clinical team — so the paperwork takes care of itself and the hour belongs to the client.
          </p>
        </div>
      </section>

      {/* How we help */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "84px 28px" }}>
        <div style={{ textAlign: "center", maxWidth: 560, margin: "0 auto 44px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>How we help</p>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: "clamp(26px, 3vw, 38px)", letterSpacing: "-.025em", margin: "12px 0 0", color: "#0B2B6B" }}>Less admin, more presence</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HELP_CARDS.map((card) => (
            <div
              key={card.title}
              className="border border-[#E9F0F9] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_64px_-30px_rgba(11,43,107,0.4)] hover:border-[#C7DCF5]"
              style={{ background: "#FCFEFF", borderRadius: 18, padding: "28px 24px" }}
            >
              <div style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 14, background: card.iconBg }}>
                {card.icon}
              </div>
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 19, margin: "18px 0 0", color: "#0B2B6B" }}>{card.title}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#54678A", margin: "8px 0 0" }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section style={{ background: "#F2F7FD", borderTop: "1px solid #E7EFF9", borderBottom: "1px solid #E7EFF9" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "76px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: "clamp(24px, 2.5vw, 32px)", letterSpacing: "-.02em", margin: 0, color: "#0B2B6B" }}>Benefits for professionals</h2>
            <p style={{ fontSize: 16, color: "#54678A", margin: "10px 0 0" }}>Designed to let you focus on what matters most — your clients.</p>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 22, padding: 34, boxShadow: "0 22px 50px -36px rgba(11,43,107,.3)" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
              {BENEFITS.map((b) => (
                <div key={b} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 999, background: "#EAF3FF", color: "#2F80FF", fontSize: 12, fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 15, color: "#2C3E5E", fontWeight: 500, lineHeight: 1.45 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "76px 28px" }}>
        <div
          className="p-7 sm:p-[52px] flex flex-wrap items-center justify-between gap-7 relative overflow-hidden"
          style={{ background: "radial-gradient(120% 140% at 80% -30%, #16407f, #0B2B6B 60%)", borderRadius: 26 }}
        >
          <div aria-hidden="true" style={{ position: "absolute", top: -60, right: -30, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,185,200,.28), transparent 65%)" }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: "clamp(22px, 2.5vw, 32px)", letterSpacing: "-.02em", margin: 0, color: "#fff" }}>Ready to transform your practice?</h2>
            <p style={{ fontSize: 16, color: "#BACDE9", margin: "8px 0 0" }}>Join the Cognitive Care Collective today.</p>
          </div>
          <div className="relative flex gap-3 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center rounded-full font-bold text-white transition-all duration-200 px-6 py-3.5 text-[15px] shadow-[0_16px_40px_-14px_rgba(47,128,255,0.7)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-12px_rgba(47,128,255,0.85)]"
              style={{ background: "#2F80FF" }}
            >
              Get started
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-white/25 bg-white/5 font-semibold transition-all duration-200 px-[22px] py-[13px] text-[15px] text-[#EAF1FB] hover:bg-white/10 hover:border-white/50"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
