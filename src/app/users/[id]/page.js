"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { use } from "react";
import UserDetail from "../../components/users/UserDetail";

export default function UserDetailPage({ params }) {
  // Unwrap the params using React.use()
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

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserDetail userId={unwrappedParams.id} />
    </div>
  );
}
