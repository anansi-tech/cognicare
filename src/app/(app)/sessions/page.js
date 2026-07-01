"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAuthenticated } from "@/lib/client-auth";
import SessionList from "@/app/components/sessions/SessionList";
import { Spinner } from "@/components/ui/Spinner";

function SessionsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Spinner size={40} />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated(session)) {
    return null;
  }

  return <SessionList initialStatusFilter={statusFilter} />;
}

export default function SessionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Spinner size={40} /></div>}>
      <SessionsContent />
    </Suspense>
  );
}
