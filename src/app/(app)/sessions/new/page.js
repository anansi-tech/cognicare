"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAuthenticated } from "@/lib/client-auth";
import SessionForm from "@/app/components/sessions/SessionForm";

function NewSessionContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const initialDate = searchParams.get("date");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (!isAuthenticated(session)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div style={{ maxWidth: 940 }} className="mx-auto">
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>Session</p>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 28, letterSpacing: "-.025em", margin: "6px 0 0", color: "#0B2B6B" }}>
            New session
          </h1>
        </div>
        <SessionForm
          onSuccess={(newSession) => {
            if (newSession && newSession._id) {
              router.push(`/sessions/${newSession._id}`);
            } else {
              router.push("/sessions");
            }
          }}
          onCancel={() => router.push("/sessions")}
          initialClientId={clientId}
          initialDate={initialDate}
        />
      </div>
    </div>
  );
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewSessionContent />
    </Suspense>
  );
}
