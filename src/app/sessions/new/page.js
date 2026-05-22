"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAuthenticated } from "@/lib/client-auth";
import SessionForm from "../../components/sessions/SessionForm";

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
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">New Session</h1>
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
