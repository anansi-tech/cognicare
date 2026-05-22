"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import UserForm from "../components/users/UserForm";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${session.user.id}`);
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      setUser(data);
      setError(null);
    } catch (err) {
      setError("Error loading profile");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    fetchUserProfile(); // Refresh the profile data
  };

  const handleCancel = () => {
    router.push("/dashboard"); // Navigate back to dashboard when cancel is clicked
  };

  if (status === "loading" || loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        {error}
        <button
          onClick={fetchUserProfile}
          className="ml-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      {user && (
        <div className="bg-white shadow rounded-lg p-6">
          <UserForm user={user} onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      )}
    </div>
  );
}
