"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Brain, Target, TrendingUp, FileText,
  Zap, Calendar, CreditCard, Lock, Building2, ArrowRight,
} from "lucide-react";

// ── static data ───────────────────────────────────────────────────────────────

const AGENTS = [
  { num: "1", title: "Assessment",     desc: "Structured intake & risk evaluation from your observations.",      glow: "#4DBB6A", glowSoft: "rgba(77,187,106,.4)",    tint: "#E7F6EC", delay: "0s",   Icon: ClipboardList },
  { num: "2", title: "Diagnostic",     desc: "DSM-5-TR / ICD-10 differential, with the criteria laid out.",     glow: "#158A98", glowSoft: "rgba(21,138,152,.4)",    tint: "#E2F4F2", delay: "1.1s", Icon: Brain },
  { num: "3", title: "Treatment",      desc: "Evidence-based plan with measurable, trackable goals.",            glow: "#2F80FF", glowSoft: "rgba(47,128,255,.4)",    tint: "#EAF3FF", delay: "2.2s", Icon: Target },
  { num: "4", title: "Progress",       desc: "Measurement-based evaluation against the plan over time.",        glow: "#25B9C8", glowSoft: "rgba(37,185,200,.4)",    tint: "#E4F7FA", delay: "3.3s", Icon: TrendingUp },
  { num: "5", title: "Documentation",  desc: "Drafts SOAP notes you review, edit and approve.",                 glow: "#0B2B6B", glowSoft: "rgba(11,43,107,.35)",   tint: "#E8EDF7", delay: "4.4s", Icon: FileText },
];

const FEATURES = [
  { title: "Self-driving workflows",  desc: "Intake, session prep and post-session notes generate on their own when the event happens — no buttons to push.",    tint: "#EAF3FF", color: "#2F80FF", Icon: Zap },
  { title: "Scheduling",              desc: "Recurring appointments, automatic client email reminders, and no-show tracking — handled in the background.",        tint: "#E2F4F2", color: "#158A98", Icon: Calendar },
  { title: "Billing & consent",       desc: "Invoices with Stripe payment links and type-to-sign e-signature consent forms that generate a signed PDF.",          tint: "#E7F6EC", color: "#4DBB6A", Icon: CreditCard },
  { title: "Narrative reports",       desc: "Compile a date-ranged clinical report from the agents’ work and export it as a polished PDF.",                  tint: "#E4F7FA", color: "#1597A6", Icon: FileText },
  { title: "Audit trail",             desc: "Every PHI access and change is logged — accountability your compliance program can stand on.",                       tint: "#E8EDF7", color: "#0B2B6B", Icon: Lock },
  { title: "Multi-tenant by design",  desc: "Every record scoped by practice. A solo clinician is a practice of one; groups scale without leaks.",               tint: "#EAF3FF", color: "#2F80FF", Icon: Building2 },
];

const SOLO_FEATURES     = ["Full AI clinical team + LIAM", "Measurement-based care (PHQ-9 / GAD-7)", "Scheduling & reminders", "Billing, consent & reports", "Audit trail"];
const PRACTICE_FEATURES = ["Everything in Solo, per seat", "Invite & manage colleagues", "Assignment-based confidentiality", "Owner sees the whole practice", "Case transfer between clinicians"];

const TRUST_ITEMS = ["PHQ-9 / GAD-7", "DSM-5-TR · ICD-10", "SOAP notes", "Stripe billing", "E-signature consent", "Audit trail"];

// ── sub-components ────────────────────────────────────────────────────────────

function LogoMark({ size = 38, radius = 11, bgColor = "#0B2B6B", iconSize = 21 }) {
  return (
    <span style={{ display: "grid", placeItems: "center", width: size, height: size, borderRadius: radius, background: bgColor, flexShrink: 0 }}>
      <svg width={iconSize} height={iconSize} viewBox="0 0 512 512">
        <path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" fill="none" stroke="#25B9C8" strokeWidth="46" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Eyebrow({ children, style }) {
  return (
    <div className="text-[13px] font-bold uppercase" style={{ letterSpacing: ".12em", color: "#2F80FF", ...style }}>
      {children}
    </div>
  );
}

function SectionH2({ children, style }) {
  return (
    <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 44, lineHeight: 1.06, letterSpacing: "-.025em", color: "#0B2B6B", textWrap: "balance", margin: 0, ...style }}>
      {children}
    </h2>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [annual, setAnnual] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  const isAuthed = status === "authenticated" && !!session?.user?.id;
  useEffect(() => {
    if (isAuthed) router.replace("/dashboard");
  }, [isAuthed, router]);

  if (isAuthed) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  const soloPrice     = annual ? "$55" : "$69";
  const practicePrice = annual ? "$47" : "$59";
  const soloNote      = annual ? "billed annually" : "billed monthly";
  const practiceNote  = annual ? "per seat · billed annually" : "per seat · billed monthly";

  return (
    <div
      style={{ fontFamily: "var(--font-hanken, system-ui, sans-serif)", color: "#0B2B6B", background: "#FCFEFF" }}
    >

      {/* ── ANNOUNCEMENT BAR ───────────────────────────────────────────────── */}
      {showAnnouncement && (
        <div
          className="flex items-center justify-center gap-3 py-2 px-5 text-center text-[13.5px] font-medium"
          style={{ background: "#081f54", color: "#BBD3F7", letterSpacing: ".01em" }}
        >
          <span>Pre-launch · HIPAA-aligned, hardening in progress — explore with synthetic data and a 14-day trial.</span>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-base leading-none opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── STICKY NAV ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ backdropFilter: "saturate(160%) blur(12px)", background: "rgba(252,254,255,.82)", borderColor: "#E3ECF7" }}
      >
        <nav
          className="mx-auto flex items-center justify-between gap-6"
          style={{ maxWidth: 1200, padding: "15px 28px" }}
        >
          <a href="#top" className="flex items-center gap-3 no-underline flex-shrink-0">
            <LogoMark />
            <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, letterSpacing: "-.02em" }}>
              <span style={{ color: "#0B2B6B" }}>Cogni</span><span style={{ color: "#158A98" }}>Care</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {[["#pipeline", "How it works"], ["#liam", "LIAM"], ["#practice", "Practice"], ["#pricing", "Pricing"]].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="text-[15px] font-medium no-underline transition-colors duration-150 hover:text-primary"
                style={{ color: "#41557A" }}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3.5">
            <Link
              href="/login"
              className="text-[15px] font-semibold no-underline hover:text-primary transition-colors duration-150"
              style={{ color: "#0B2B6B" }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-white text-[15px] font-semibold px-[18px] py-2.5 rounded-full no-underline transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: "#2F80FF", boxShadow: "0 10px 26px -12px rgba(47,128,255,.7)" }}
            >
              Start free trial
            </Link>
          </div>
        </nav>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section
        id="top"
        className="relative overflow-hidden"
        style={{ background: "radial-gradient(120% 95% at 80% -12%, #16407f 0%, #0B2B6B 46%, #081f54 100%)", color: "#EAF1FB" }}
      >
        {/* dotted texture */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.07) 1px, transparent 0)", backgroundSize: "26px 26px", maskImage: "linear-gradient(to bottom, #000 0%, transparent 78%)" }} />
        {/* blobs */}
        <div aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ top: -140, right: -60, width: 460, height: 460, background: "radial-gradient(circle, rgba(37,185,200,.32), transparent 66%)", filter: "blur(8px)" }} />
        <div aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ bottom: -160, left: -120, width: 440, height: 440, background: "radial-gradient(circle, rgba(47,128,255,.3), transparent 66%)" }} />

        <div
          className="relative mx-auto grid items-center"
          style={{ maxWidth: 1200, padding: "84px 28px 96px", gridTemplateColumns: "1.05fr .95fr", gap: 56 }}
        >
          {/* left: copy */}
          <div>
            {/* eyebrow pill */}
            <div
              className="inline-flex items-center gap-2.5 text-[13px] font-semibold"
              style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", padding: "7px 14px 7px 11px", borderRadius: 999, color: "#BFE6EC", letterSpacing: ".02em" }}
            >
              <span className="inline-block rounded-full flex-shrink-0" style={{ width: 7, height: 7, background: "#4DBB6A", boxShadow: "0 0 0 4px rgba(77,187,106,.25)" }} />
              Your AI clinical team
            </div>

            <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 62, lineHeight: 1.02, letterSpacing: "-.03em", margin: "22px 0 0", color: "#fff", textWrap: "balance" }}>
              More care.<br />
              <span style={{ color: "#54C8D6" }}>Less paperwork.</span>
            </h1>

            <p style={{ fontSize: 19, lineHeight: 1.55, color: "#B7CBE8", margin: "22px 0 0", maxWidth: 520 }}>
              CogniCare gives mental-health therapists an AI clinical team — five specialized agents that assess, diagnose, plan, track progress and draft notes — plus{" "}
              <strong style={{ color: "#DCEBFF", fontWeight: 600 }}>LIAM</strong>, an in-session copilot grounded in each client&apos;s own record.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-3.5 mt-8 flex-wrap">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 text-white font-bold no-underline rounded-full transition-all duration-200 hover:-translate-y-0.5"
                style={{ fontSize: 16, padding: "15px 26px", background: "#2F80FF", boxShadow: "0 16px 40px -14px rgba(47,128,255,.75)" }}
              >
                Start 14-day free trial <ArrowRight size={17} strokeWidth={2.2} />
              </a>
              <a
                href="#pipeline"
                className="inline-flex items-center gap-2 font-semibold no-underline rounded-full transition-all duration-200 hover:bg-white/10"
                style={{ fontSize: 16, padding: "14px 24px", color: "#EAF1FB", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.24)" }}
              >
                See how it works
              </a>
            </div>

            {/* trust chips */}
            <div className="flex items-center gap-7 mt-10 flex-wrap" style={{ color: "#8FA8CE", fontSize: 13.5, fontWeight: 500 }}>
              <span className="inline-flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" stroke="#54C8D6" strokeWidth="1.8" strokeLinejoin="round" /></svg>
                Assignment-based confidentiality
              </span>
              <span className="inline-flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke="#54C8D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Clinician signs off on everything
              </span>
            </div>
          </div>

          {/* right: floating mock cards */}
          <div className="relative" style={{ height: 480 }}>
            {/* client card */}
            <div
              className="absolute bg-white"
              style={{ top: 18, right: 0, width: 330, borderRadius: 18, padding: "18px 18px 16px", boxShadow: "0 40px 80px -30px rgba(4,16,46,.6)", animation: "ccFloat 6s ease-in-out infinite" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid place-items-center font-extrabold text-[14px]" style={{ width: 34, height: 34, borderRadius: 10, background: "#EAF3FF", color: "#2F80FF", fontFamily: "var(--font-bricolage, sans-serif)" }}>M</span>
                  <div>
                    <div className="font-bold text-[14px]" style={{ color: "#0B2B6B" }}>Maya R.</div>
                    <div className="text-[11.5px]" style={{ color: "#6E83A6" }}>Session 7 · today</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ color: "#158A98", background: "#E2F4F2" }}>ACTIVE</span>
              </div>
              <div className="mt-3.5 p-3 rounded-xl" style={{ background: "#F2F7FD" }}>
                <div className="flex items-center justify-between text-[11.5px] font-semibold" style={{ color: "#41557A" }}>
                  <span>PHQ-9</span>
                  <span style={{ color: "#4DBB6A" }}>▼ 6 pts</span>
                </div>
                <svg width="100%" height="46" viewBox="0 0 280 46" style={{ marginTop: 6 }} preserveAspectRatio="none">
                  <polyline points="0,8 56,14 112,20 168,26 224,34 280,40" fill="none" stroke="#4DBB6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="280" cy="40" r="4" fill="#4DBB6A" />
                </svg>
              </div>
            </div>

            {/* LIAM card */}
            <div
              className="absolute bg-white"
              style={{ top: 150, left: 0, width: 312, borderRadius: 18, padding: "16px 17px", boxShadow: "0 40px 80px -30px rgba(4,16,46,.55)", animation: "ccFloat2 7s ease-in-out infinite" }}
            >
              <div className="flex items-center gap-2 text-[12px] font-bold" style={{ color: "#2F80FF", letterSpacing: ".04em" }}>
                <span className="grid place-items-center" style={{ width: 22, height: 22, borderRadius: 7, background: "#0B2B6B" }}>
                  <svg width="13" height="13" viewBox="0 0 512 512"><path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" fill="none" stroke="#54C8D6" strokeWidth="58" strokeLinecap="round" /></svg>
                </span>
                LIAM
              </div>
              <p className="mt-3 text-[13px]" style={{ lineHeight: 1.5, color: "#2C3E5E", margin: "11px 0 0" }}>
                Client reported improved sleep since week 4. Last GAD-7 was <strong style={{ color: "#0B2B6B" }}>9 (mild)</strong>, down from 14. Reassessment due next session.
              </p>
              <div className="flex items-center gap-1.5 text-[11px]" style={{ marginTop: 11, color: "#9AAFCE" }}>
                <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: "#4DBB6A", animation: "ccBlink 1.4s infinite" }} />
                Grounded in Maya&apos;s record
              </div>
            </div>

            {/* Documentation card */}
            <div
              className="absolute"
              style={{ bottom: 6, right: 26, width: 256, borderRadius: 16, padding: "15px 16px", background: "linear-gradient(135deg, #123a86, #0B2B6B)", boxShadow: "0 30px 60px -26px rgba(4,16,46,.7)", animation: "ccFloat 6.5s ease-in-out infinite .4s" }}
            >
              <div className="text-[11px] font-bold" style={{ color: "#7FB0FF", letterSpacing: ".05em" }}>DOCUMENTATION AGENT</div>
              <div className="text-[13px] font-semibold" style={{ marginTop: 8, color: "#DDE9FB" }}>SOAP note drafted</div>
              <div className="flex gap-1.5" style={{ marginTop: 9 }}>
                {["#4DBB6A", "#25B9C8", "#2F80FF", "rgba(255,255,255,.2)"].map((bg, i) => (
                  <span key={i} className="flex-1" style={{ height: 5, borderRadius: 3, background: bg }} />
                ))}
              </div>
              <div className="text-[11px]" style={{ marginTop: 9, color: "#8FA8CE" }}>Awaiting your review →</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ────────────────────────────────────────────────────── */}
      <section className="bg-white border-b" style={{ borderColor: "#EDF3FA" }}>
        <div
          className="mx-auto flex items-center justify-center flex-wrap py-6 px-7"
          style={{ maxWidth: 1080, gap: "12px 14px", fontSize: 13.5, fontWeight: 600, color: "#6E83A6" }}
        >
          <span style={{ color: "#9AAFCE" }}>Built for the modern clinical workflow:</span>
          {TRUST_ITEMS.map((item, i) => (
            <span key={item} className="inline-flex items-center gap-3.5">
              {item}
              {i < TRUST_ITEMS.length - 1 && <span style={{ color: "#CBD9EC" }}>·</span>}
            </span>
          ))}
        </div>
      </section>

      {/* ── PIPELINE ───────────────────────────────────────────────────────── */}
      <section id="pipeline" className="py-24 px-7" style={{ background: "#FCFEFF" }}>
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div className="text-center mx-auto" style={{ maxWidth: 680 }}>
            <Eyebrow>The AI clinical team</Eyebrow>
            <SectionH2 style={{ marginTop: 14 }}>Five specialists, running as one pipeline</SectionH2>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: "#41557A", marginTop: 16 }}>
              Each agent feeds the next and stores its work to the client record. The workflows are self-driving — they run on the event, not on a button.
            </p>
          </div>

          <div className="relative mt-16">
            {/* animated dashed connector */}
            <div aria-hidden="true" className="absolute" style={{ top: 46, left: "8%", right: "8%", height: 2 }}>
              <svg width="100%" height="2" preserveAspectRatio="none">
                <line x1="0" y1="1" x2="100%" y2="1" stroke="#2F80FF" strokeWidth="2" strokeDasharray="8 8" style={{ animation: "ccDash 6s linear infinite" }} />
              </svg>
            </div>

            <div className="relative grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 18 }}>
              {AGENTS.map(({ num, title, desc, glow, glowSoft, tint, delay, Icon }) => (
                <div
                  key={num}
                  className="bg-white border rounded-[18px] transition-all duration-200 hover:-translate-y-1.5 cursor-default"
                  style={{
                    padding: "22px 18px 20px",
                    borderColor: "#E3ECF7",
                    boxShadow: "0 18px 40px -28px rgba(11,43,107,.25)",
                    animation: "ccGlow 6s ease-in-out infinite",
                    animationDelay: delay,
                    "--glow-color": glow,
                    "--glow-soft": glowSoft,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid place-items-center rounded-[13px]" style={{ width: 44, height: 44, background: tint, color: glow }}>
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 30, color: "#E7EEF8", lineHeight: 1 }}>{num}</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 18, margin: "16px 0 0", color: "#0B2B6B" }}>{title}</h3>
                  <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#54678A", margin: "7px 0 0" }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* +1 Report agent pill */}
          <div className="mt-7 flex justify-center">
            <div
              className="inline-flex items-center gap-3 border rounded-[14px]"
              style={{ background: "#F2F7FD", borderColor: "#E0EBF8", padding: "13px 20px" }}
            >
              <span
                className="grid place-items-center rounded-[9px] text-white text-[12px] font-extrabold flex-shrink-0"
                style={{ width: 30, height: 30, background: "#0B2B6B", fontFamily: "var(--font-bricolage, sans-serif)" }}
              >
                +1
              </span>
              <span style={{ fontSize: 14, color: "#2C3E5E" }}>
                <strong style={{ color: "#0B2B6B" }}>Report agent</strong> synthesizes the pipeline into a date-ranged narrative clinical report — exported as PDF.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIAM ───────────────────────────────────────────────────────────── */}
      <section
        id="liam"
        className="relative overflow-hidden py-24 px-7"
        style={{ background: "linear-gradient(180deg, #0B2B6B, #081f54)", color: "#EAF1FB" }}
      >
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)", backgroundSize: "28px 28px", maskImage: "radial-gradient(80% 80% at 30% 30%, #000, transparent 75%)" }} />

        <div className="relative mx-auto grid items-center" style={{ maxWidth: 1200, gridTemplateColumns: ".92fr 1.08fr", gap: 60 }}>
          {/* left: copy */}
          <div>
            <div
              className="inline-flex items-center gap-2.5 text-[13px] font-bold rounded-full"
              style={{ background: "rgba(84,200,214,.14)", border: "1px solid rgba(84,200,214,.3)", padding: "7px 14px", color: "#7FE0EC", letterSpacing: ".03em" }}
            >
              IN-SESSION COPILOT
            </div>
            <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 46, lineHeight: 1.03, letterSpacing: "-.03em", margin: "20px 0 0", color: "#fff" }}>
              Meet LIAM
            </h2>
            <p style={{ fontSize: 16, color: "#8FA8CE", margin: "8px 0 0", fontWeight: 600 }}>
              Listening Intelligent Assistant for Mental health
            </p>
            <p style={{ fontSize: 18, lineHeight: 1.58, color: "#BACDE9", margin: "20px 0 0", maxWidth: 480 }}>
              Not a generic chatbot. LIAM answers grounded in{" "}
              <em className="not-italic font-semibold" style={{ color: "#DDEBFF" }}>this</em> client&apos;s full record, with rolling per-clinician memory — so mid-session you can ask what changed since last time and get an answer you can trust.
            </p>
            <ul className="list-none p-0 grid gap-3.5" style={{ margin: "26px 0 0" }}>
              {[
                "Per-(clinician, client) rolling memory across sessions",
                "Answers cite the record — assessments, notes, scored trends",
                "Decision support only — you stay in control",
              ].map((item) => (
                <li key={item} className="flex gap-3 items-start text-[15px]" style={{ color: "#DDEBFF" }}>
                  <span className="flex-shrink-0 mt-0.5" style={{ color: "#54C8D6" }}>◆</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* right: chat mock */}
          <div
            className="rounded-[22px]"
            style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.12)", padding: 22, backdropFilter: "blur(6px)" }}
          >
            <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,.1)" }}>
              <span className="grid place-items-center rounded-[11px]" style={{ width: 38, height: 38, background: "#0B2B6B", border: "1px solid rgba(255,255,255,.14)", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 512 512"><path d="M352 166c-26-24-60-38-98-38-74 0-134 56-134 128s60 128 134 128c38 0 72-14 98-38" fill="none" stroke="#54C8D6" strokeWidth="50" strokeLinecap="round" /></svg>
              </span>
              <div>
                <div className="font-bold text-[15px] text-white">LIAM</div>
                <div className="text-[12px]" style={{ color: "#8FA8CE" }}>Re: Maya R. · Session 7</div>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: "#9AAFCE" }}>
                <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: "#4DBB6A", animation: "ccBlink 1.4s infinite" }} />
                memory on
              </div>
            </div>

            <div className="grid gap-3.5 mt-4">
              <div className="justify-self-end text-[14px] text-white px-4 py-3" style={{ maxWidth: "78%", background: "#2F80FF", borderRadius: "16px 16px 4px 16px", lineHeight: 1.45 }}>
                What&apos;s changed in Maya&apos;s anxiety since we started?
              </div>
              <div className="justify-self-start text-[14px] px-4 py-3" style={{ maxWidth: "88%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", color: "#E6EFFB", borderRadius: "16px 16px 16px 4px", lineHeight: 1.55 }}>
                GAD-7 has dropped from <strong className="text-white">14 (moderate)</strong> at intake to <strong style={{ color: "#7FE0EC" }}>9 (mild)</strong> — a reliable change. Sleep improved from week 4. She flagged work stress in sessions 5–6; that theme is still active in your treatment goals.
              </div>
              <div className="justify-self-start flex gap-1.5 items-center pl-1">
                {[0, 0.2, 0.4].map((d) => (
                  <span key={d} className="inline-block rounded-full" style={{ width: 5, height: 5, background: "#7F95BA", animation: `ccBlink 1s infinite ${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24 px-7">
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <div style={{ maxWidth: 640 }}>
            <Eyebrow>Runs the whole practice</Eyebrow>
            <SectionH2 style={{ marginTop: 14 }}>Everything around the work, handled</SectionH2>
          </div>
          <div className="grid mt-11" style={{ gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {FEATURES.map(({ title, desc, tint, color, Icon }) => (
              <div
                key={title}
                className="border rounded-[18px] transition-all duration-200 hover:-translate-y-1.5 cursor-default"
                style={{ background: "#FCFEFF", borderColor: "#E9F0F9", padding: "26px 24px" }}
              >
                <span className="grid place-items-center rounded-[14px]" style={{ width: 48, height: 48, background: tint, color }}>
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 19, margin: "18px 0 0", color: "#0B2B6B" }}>{title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "#54678A", margin: "8px 0 0" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEASUREMENT / PRACTICE SPLIT ───────────────────────────────────── */}
      <section id="practice" className="py-24 px-7" style={{ background: "#F2F7FD" }}>
        <div className="mx-auto grid" style={{ maxWidth: 1200, gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* MBC card */}
          <div className="bg-white border rounded-[24px]" style={{ borderColor: "#E3ECF7", padding: 38, boxShadow: "0 22px 50px -34px rgba(11,43,107,.3)" }}>
            <div className="text-[13px] font-bold uppercase" style={{ letterSpacing: ".1em", color: "#158A98" }}>Measurement-based care</div>
            <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: "12px 0 0", color: "#0B2B6B" }}>
              See the trend, not just the session
            </h3>
            <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "#54678A", margin: "12px 0 18px" }}>
              Administer PHQ-9 / GAD-7, track scored trends over time, and surface reliable-change and reassessment-due signals automatically.
            </p>
            <div className="border rounded-[16px]" style={{ background: "#FAFCFF", borderColor: "#EAF1FA", padding: 18 }}>
              <div className="flex justify-between items-baseline">
                <span className="text-[12.5px] font-bold" style={{ color: "#41557A" }}>GAD-7 · 8 weeks</span>
                <span className="text-[12.5px] font-bold" style={{ color: "#4DBB6A" }}>Reliable improvement</span>
              </div>
              <svg width="100%" height="120" viewBox="0 0 460 120" style={{ marginTop: 10 }} preserveAspectRatio="none">
                <polyline points="0,20 66,24 132,38 198,46 264,58 330,72 396,84 460,96" fill="none" stroke="#2F80FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="0" cy="20" r="4" fill="#0B2B6B" />
                <circle cx="460" cy="96" r="5" fill="#4DBB6A" />
              </svg>
              <div className="flex justify-between mt-1" style={{ fontSize: 11, color: "#9AAFCE" }}>
                <span>Intake · 14</span><span>Now · 9</span>
              </div>
            </div>
          </div>

          {/* Practice & team card */}
          <div className="relative overflow-hidden rounded-[24px]" style={{ background: "linear-gradient(135deg, #123a86, #0B2B6B)", color: "#EAF1FB", padding: 38 }}>
            <div aria-hidden="true" className="absolute rounded-full pointer-events-none" style={{ top: -60, right: -40, width: 240, height: 240, background: "radial-gradient(circle, rgba(37,185,200,.3), transparent 65%)" }} />
            <div className="relative">
              <div className="text-[13px] font-bold uppercase" style={{ letterSpacing: ".1em", color: "#7FE0EC" }}>Practice & team</div>
              <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.02em", margin: "12px 0 0", color: "#fff" }}>
                Solo or group — confidentiality built in
              </h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "#BACDE9", margin: "12px 0 22px" }}>
                Invite colleagues, transfer cases, and keep clients private by assignment. A clinician sees only their own; the owner sees the whole practice.
              </p>
              <div className="grid gap-3">
                {[
                  { initials: "DR", bg: "#2F80FF", name: "Dr. Reyes · Owner", sub: "Sees all 4 clinicians", access: "Full access", ac: "#54C8D6" },
                  { initials: "JL", bg: "#158A98", name: "J. Lin · Clinician",  sub: "Own caseload only",    access: "Scoped",      ac: "#8FA8CE" },
                ].map(({ initials, bg, name, sub, access, ac }) => (
                  <div key={initials} className="flex items-center gap-3 rounded-[13px]" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", padding: "13px 15px" }}>
                    <span className="grid place-items-center rounded-[9px] text-white font-extrabold text-[12px] flex-shrink-0" style={{ width: 30, height: 30, background: bg, fontFamily: "var(--font-bricolage, sans-serif)" }}>{initials}</span>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold text-white">{name}</div>
                      <div className="text-[11.5px]" style={{ color: "#8FA8CE" }}>{sub}</div>
                    </div>
                    <span className="text-[11px]" style={{ color: ac }}>{access}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-7" style={{ background: "#FCFEFF" }}>
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <div className="text-center mx-auto" style={{ maxWidth: 620 }}>
            <Eyebrow>Pricing</Eyebrow>
            <SectionH2 style={{ marginTop: 14 }}>Simple plans, 14-day trial</SectionH2>
            <p style={{ fontSize: 17, color: "#54678A", marginTop: 14 }}>Start free. No card games — cancel anytime from the customer portal.</p>

            {/* billing toggle */}
            <div
              className="inline-flex items-center gap-1 mt-7 rounded-full p-1"
              style={{ background: "#EEF4FC", border: "1px solid #E0EBF8" }}
            >
              {[
                { label: "Monthly", active: !annual, onClick: () => setAnnual(false) },
                { label: <>Annual <span style={{ color: "#4DBB6A" }}>−20%</span></>, active: annual, onClick: () => setAnnual(true) },
              ].map(({ label, active, onClick }, i) => (
                <button
                  key={i}
                  onClick={onClick}
                  className="font-bold rounded-full border-0 cursor-pointer transition-all duration-200"
                  style={{ fontFamily: "inherit", fontSize: 13.5, padding: "9px 20px", background: active ? "#fff" : "transparent", color: active ? "#0B2B6B" : "#6E83A6", boxShadow: active ? "0 2px 8px -2px rgba(11,43,107,.2)" : "none" }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid mx-auto mt-11" style={{ maxWidth: 840, gridTemplateColumns: "1fr 1fr", gap: 22 }}>
            {/* Solo */}
            <div
              className="bg-white border rounded-[22px] transition-transform duration-200 hover:-translate-y-1.5"
              style={{ borderColor: "#E3ECF7", padding: 34 }}
            >
              <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, color: "#0B2B6B" }}>Solo</div>
              <p style={{ fontSize: 14, color: "#6E83A6", marginTop: 6 }}>For the independent practitioner — a practice of one.</p>
              <div className="flex items-baseline gap-1 mt-5">
                <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 800, fontSize: 48, color: "#0B2B6B", letterSpacing: "-.03em" }}>{soloPrice}</span>
                <span style={{ fontSize: 15, color: "#6E83A6" }}>/mo</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#9AAFCE", marginTop: 2, height: 16 }}>{soloNote}</div>
              <Link
                href="/signup"
                className="flex items-center justify-center no-underline font-bold rounded-[12px] transition-all duration-200 hover:-translate-y-0.5"
                style={{ marginTop: 22, background: "#EAF3FF", color: "#2F80FF", fontSize: 15, padding: 13 }}
              >
                Start free trial
              </Link>
              <ul className="list-none p-0 grid gap-3" style={{ marginTop: 24 }}>
                {SOLO_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[14px]" style={{ color: "#41557A" }}>
                    <span style={{ color: "#2F80FF" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Practice */}
            <div
              className="relative rounded-[22px] transition-transform duration-200 hover:-translate-y-1.5"
              style={{ background: "linear-gradient(160deg, #123a86, #0B2B6B)", color: "#EAF1FB", padding: 34, boxShadow: "0 30px 64px -28px rgba(11,43,107,.6)" }}
            >
              <span className="absolute top-5 right-5 text-[11px] font-extrabold rounded-full" style={{ letterSpacing: ".06em", background: "#25B9C8", color: "#062a2f", padding: "5px 11px" }}>
                PER SEAT
              </span>
              <div style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 22, color: "#fff" }}>Practice</div>
              <p style={{ fontSize: 14, color: "#A8C0E2", marginTop: 6 }}>For group practices — scale seats as your team grows.</p>
              <div className="flex items-baseline gap-1 mt-5">
                <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 800, fontSize: 48, color: "#fff", letterSpacing: "-.03em" }}>{practicePrice}</span>
                <span style={{ fontSize: 15, color: "#A8C0E2" }}>/seat/mo</span>
              </div>
              <div style={{ fontSize: 12.5, color: "#7FB0FF", marginTop: 2, height: 16 }}>{practiceNote}</div>
              <Link
                href="/signup"
                className="flex items-center justify-center text-white no-underline font-bold rounded-[12px] transition-all duration-200 hover:-translate-y-0.5"
                style={{ marginTop: 22, background: "#2F80FF", fontSize: 15, padding: 13, boxShadow: "0 14px 34px -14px rgba(47,128,255,.8)" }}
              >
                Start free trial
              </Link>
              <ul className="list-none p-0 grid gap-3" style={{ marginTop: 24 }}>
                {PRACTICE_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[14px]" style={{ color: "#D7E5F9" }}>
                    <span style={{ color: "#54C8D6" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY BAND ──────────────────────────────────────────────────── */}
      <section className="bg-white pb-24 px-7">
        <div
          className="mx-auto grid items-center border rounded-[24px]"
          style={{ maxWidth: 1100, background: "#F2F7FD", borderColor: "#E3ECF7", padding: 44, gridTemplateColumns: "auto 1fr auto", gap: 32 }}
        >
          <span className="grid place-items-center rounded-[18px] flex-shrink-0" style={{ width: 64, height: 64, background: "#0B2B6B" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" stroke="#54C8D6" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" stroke="#4DBB6A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h3 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 24, color: "#0B2B6B", margin: 0 }}>
              Designed HIPAA-aligned, built on a foundation of trust
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "#54678A", margin: "8px 0 0" }}>
              Audit logging on every PHI access, assignment-based access control, session timeouts, and TLS in transit are live today. Full HIPAA readiness (OpenAI BAA + field-level PHI encryption) is in active hardening — until then, explore with synthetic data.
            </p>
          </div>
          <div className="grid gap-2 text-right whitespace-nowrap">
            {["Audit trail", "Access control", "TLS in transit"].map((item) => (
              <span key={item} className="text-[13px] font-semibold" style={{ color: "#2C3E5E" }}>✓ {item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden text-center text-white"
        style={{ background: "radial-gradient(120% 120% at 50% -20%, #16407f, #0B2B6B 55%, #081f54)", padding: "100px 28px" }}
      >
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,.06) 1px, transparent 0)", backgroundSize: "26px 26px", maskImage: "radial-gradient(60% 80% at 50% 30%, #000, transparent 75%)" }} />
        <div className="relative mx-auto" style={{ maxWidth: 720 }}>
          <h2 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 52, lineHeight: 1.04, letterSpacing: "-.03em", margin: 0, textWrap: "balance" }}>
            Give your practice an AI clinical team
          </h2>
          <p style={{ fontSize: 18, color: "#B7CBE8", marginTop: 18 }}>
            Spend your hours on clients, not paperwork. Start free — synthetic data, no risk, 14 days.
          </p>
          <div className="flex gap-3.5 justify-center mt-8 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-white font-bold no-underline rounded-full transition-all duration-200 hover:-translate-y-0.5"
              style={{ fontSize: 16, padding: "15px 28px", background: "#2F80FF", boxShadow: "0 18px 44px -14px rgba(47,128,255,.8)" }}
            >
              Start 14-day free trial
            </Link>
            <a
              href="#pipeline"
              className="inline-flex items-center gap-2 font-semibold no-underline rounded-full transition-all duration-200 hover:bg-white/10"
              style={{ fontSize: 16, padding: "14px 26px", color: "#EAF1FB", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.24)" }}
            >
              Book a walkthrough
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#081f54", color: "#8FA8CE", padding: "52px 28px 40px" }}>
        <div className="mx-auto grid" style={{ maxWidth: 1200, gridTemplateColumns: "1.8fr 1fr 1fr", gap: 56 }}>
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size={34} radius={10} iconSize={19} />
              <span style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 19, color: "#fff" }}>CogniCare</span>
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 14, maxWidth: 320, color: "#8FA8CE" }}>
              AI-powered clinical practice management for mental-health therapists. Five specialized agents, one in-session copilot, everything a modern practice needs.
            </p>
          </div>

          {[
            { heading: "Product",  links: [["#pipeline", "AI agents"], ["#liam", "LIAM copilot"], ["#practice", "Practice & team"], ["#pricing", "Pricing"]] },
            { heading: "Company",  links: [["/about", "About"], ["/contact", "Contact"]] },
          ].map(({ heading, links }) => (
            <div key={heading}>
              <div className="text-[12px] font-bold uppercase" style={{ letterSpacing: ".08em", color: "#5E79A6", marginBottom: 14 }}>{heading}</div>
              <div className="grid gap-2.5">
                {links.map(([href, label]) => (
                  <a
                    key={label}
                    href={href}
                    className="text-[14px] no-underline transition-colors duration-150 hover:text-white"
                    style={{ color: "#A8C0E2" }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mx-auto flex justify-between gap-4 flex-wrap border-t"
          style={{ maxWidth: 1200, marginTop: 36, paddingTop: 22, borderColor: "rgba(255,255,255,.08)", fontSize: 12.5, color: "#5E79A6" }}
        >
          <span>© Anansi Technology LLC. All rights reserved.</span>
          <span>Clinical decision support — the licensed clinician reviews and approves everything.</span>
        </div>
      </footer>
    </div>
  );
}
