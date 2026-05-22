"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isAuthenticated } from "@/lib/client-auth";
import SessionDetail from "../../components/sessions/SessionDetail";

export default function SessionDetailPage({ params }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const getSessionId = async () => {
      const resolvedParams = await params;
      setSessionId(resolvedParams.id);
    };
    getSessionId();
  }, [params]);

  if (status === "loading" || !sessionId) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (!isAuthenticated(session)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SessionDetail sessionId={sessionId} />
    </div>
  );
}
