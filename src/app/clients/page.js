"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAuthenticated } from "@/lib/client-auth";
import ClientList from "../components/clients/ClientList";

export default function ClientsPage() {
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
      <ClientList />
    </div>
  );
}
