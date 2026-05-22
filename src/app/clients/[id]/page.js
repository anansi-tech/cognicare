"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { use } from "react";
import { isAuthenticated } from "@/lib/client-auth";
import ClientDetail from "../../components/clients/ClientDetail";

export default function ClientDetailPage({ params }) {
  const unwrappedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

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
      <ClientDetail clientId={unwrappedParams.id} />
    </div>
  );
}
