// Same function names + return shapes as the v4 helpers — the ~60 consumers
// (`getCurrentUser`, `requireAuth`, etc.) keep working with no edits. Only the
// plumbing changed: getServerSession(authOptions) -> auth().
import { auth } from "@/auth";

export async function getSession() {
  return await auth();
}

export async function getCurrentUser() {
  return (await auth())?.user;
}

export async function isAuthenticated() {
  return !!(await auth());
}

export async function isCounselor() {
  return (await auth())?.user?.role === "counselor";
}

export async function isAdmin() {
  return (await auth())?.user?.role === "admin";
}

export function requireAuth(handler) {
  return async (req, context) => {
    const session = await auth();
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
    const session = await auth();
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
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return handler(req, session);
  };
}
