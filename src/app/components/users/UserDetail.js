"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import UserForm from "./UserForm";

export default function UserDetail({ userId }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/users/${userId}`);

      // Check if the response is empty
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from server");
      }

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.error("Response Text:", text);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch user");
      }

      setUser(data);
    } catch (err) {
      console.error("Error fetching user:", err);
      setError(err.message || "Error loading user");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
    fetchUser();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      // Check if the response is empty
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from server");
      }

      // Try to parse the JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON Parse Error:", e);
        console.error("Response Text:", text);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete user");
      }

      router.push("/users");
    } catch (err) {
      console.error("Error deleting user:", err);
      setError(err.message || "Error deleting user");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button
          onClick={() => fetchUser()}
          className="mt-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-600">User not found</p>
        <button
          onClick={() => router.push("/users")}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Users
        </button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Edit User</h1>
        <UserForm user={user} onSuccess={handleEditSuccess} onCancel={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Details</h1>
        <div className="space-x-4">
          <button
            onClick={() => router.push("/users")}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-lg text-gray-900">{user.name}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-lg text-gray-900">{user.email}</dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="mt-1 text-lg text-gray-900 capitalize">{user.role}</dd>
          </div>

          {user.licenseNumber && (
            <div>
              <dt className="text-sm font-medium text-gray-500">License Number</dt>
              <dd className="mt-1 text-lg text-gray-900">{user.licenseNumber}</dd>
            </div>
          )}

          {user.specialization && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Specialization</dt>
              <dd className="mt-1 text-lg text-gray-900">{user.specialization}</dd>
            </div>
          )}

          <div>
            <dt className="text-sm font-medium text-gray-500">Created At</dt>
            <dd className="mt-1 text-lg text-gray-900">
              {new Date(user.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
