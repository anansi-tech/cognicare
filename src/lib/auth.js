import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}

export async function isCounselor() {
  const session = await getSession();
  return session?.user?.role === "counselor";
}

export async function isAdmin() {
  const session = await getSession();
  return session?.user?.role === "admin";
}

export function requireAuth(handler) {
  return async (req, context) => {
    const session = await getSession();

    if (!session) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handler(req, context);
  };
}

export function requireCounselor(handler) {
  return async (req) => {
    const session = await getSession();

    if (!session || session.user.role !== "counselor") {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handler(req, session);
  };
}

export function requireAdmin(handler) {
  return async (req) => {
    const session = await getSession();

    if (!session || session.user.role !== "admin") {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handler(req, session);
  };
}
