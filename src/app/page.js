"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PricingPlans from "@/app/components/PricingPlans";
import { Brand } from "@/components/Brand";

function ValueItem({ title, children }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authed users on `/` should land in the app, not see marketing layered
  // under the Navbar. Done in an effect so we never call router.replace
  // during render. The previous version disabled this to avoid a redirect
  // chain into /billing; the chain went away once SubscriptionGate stopped
  // bouncing dev-mode and unauthed users (Round 9 / Round 10).
  const isAuthed = status === "authenticated" && !!session?.user?.id;
  useEffect(() => {
    if (isAuthed) router.replace("/dashboard");
  }, [isAuthed, router]);

  if (isAuthed) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const handleGetStarted = () => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  const handleUpgrade = () => {
    // Subscribing happens at /billing now (auth-gated). Send the user there;
    // anonymous visitors go through signup first.
    if (status === "authenticated") router.push("/billing");
    else router.push("/signup");
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Hero Section */}
      <section className="py-16 sm:py-20 px-4 text-center">
        <h1 className="mb-4">
          <Brand className="text-6xl font-bold" />
        </h1>
        <h2 className="text-2xl text-foreground/80 mb-8 font-medium">Your AI clinical team</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Specialized agents handle assessment, diagnosis, treatment planning, progress tracking,
          and documentation — so you focus on the therapy, not the paperwork.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="bg-white text-primary px-8 py-3 rounded-full font-medium border border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
          >
            Log In
          </Link>
          <button
            onClick={handleGetStarted}
            className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors shadow-lg hover:shadow"
          >
            Start 14-day free trial
          </button>
        </div>
      </section>

      {/* Hero — the canonical agent-pipeline illustration. PNG is transparent
          so the page surround shows through; a faint top border separates it
          from the hero text section above. No card framing — the diagram
          stands on its own. */}
      <section className="border-t border-border py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <Image
            src="/hero.png"
            alt="How CogniCare works — five specialists, one workflow: Assessment → Diagnostic → Treatment → Progress → Documentation, with LIAM as the in-session copilot."
            width={1600}
            height={900}
            className="w-full h-auto block"
            priority
          />
        </div>
      </section>

      {/* What you also get — practice features beyond the agent pipeline */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Built for how your practice actually runs
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            <ValueItem title="LIAM, your in-session copilot">
              Ask anything mid-session — LIAM answers from this client&apos;s full record, not a
              generic chatbot.
            </ValueItem>
            <ValueItem title="Solo or group practice">
              Invite colleagues, share a roster with assignment-based confidentiality, manage seats
              from one place.
            </ValueItem>
            <ValueItem title="Scheduling that runs itself">
              Recurring appointments, automatic client reminders, no-show tracking — without leaving
              the chart.
            </ValueItem>
            <ValueItem title="Billing and consent in one place">
              E-signature consent forms, invoices, and Stripe payment links — built into the client
              record.
            </ValueItem>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <div id="pricing" className="py-16 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
              Simple, Fair Pricing
            </h2>
            <p className="mt-4 text-xl text-muted-foreground">
              Choose the plan that works best for you
            </p>
          </div>
          <div className="mt-12">
            <PricingPlans
              subscription={null}
              onUpgrade={handleUpgrade}
              upgrading={false}
              showUpgradeButton={true}
              showGetStartedButton={!session}
              onGetStarted={handleGetStarted}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-secondary border-t border-border">
        <div className="max-w-screen-xl mx-auto px-4 pt-12 pb-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">CogniCare</h3>
              <p className="text-sm text-muted-foreground">
                Helping therapists focus on what matters most — their clients.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#pricing" className="text-muted-foreground hover:text-primary">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-muted-foreground hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-muted-foreground hover:text-primary">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* Copyright bottom bar — its own row, edge-to-edge divider above. */}
        <div className="border-t border-border">
          <div className="max-w-screen-xl mx-auto px-4 py-4 text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} CogniCare. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
