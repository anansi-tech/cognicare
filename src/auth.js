import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Practice from "@/models/practice";
import { logAuditEvent, AuditActions, EntityTypes } from "@/lib/audit";
import authConfig from "@/auth.config";

// Auth.js v5 — Node-side config. Composes the edge-safe baseline from
// auth.config.js and adds the DB-backed providers, callbacks, and events.
// Middleware does NOT import this file (it imports auth.config directly) so
// Mongoose never reaches the Edge bundler.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        try {
          await connectDB();
          const user = await User.findOne({ email: credentials?.email });
          if (!user) return null; // v5: return null instead of throw
          const ok = await compare(credentials.password, user.password);
          if (!ok) return null;
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            practiceId: user.practiceId ? user.practiceId.toString() : null,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.practiceId = user.practiceId ?? null;
      }
      // Round 8 behavior preserved: refresh practiceId + the Practice's Stripe
      // status on every JWT issuance so the gate reflects webhook updates
      // without forcing a logout.
      if (token.id) {
        await connectDB();
        const fresh = await User.findById(token.id).select("practiceId role").lean();
        token.role = fresh?.role ?? token.role;
        token.practiceId = fresh?.practiceId ? fresh.practiceId.toString() : null;
        if (token.practiceId) {
          const practice = await Practice.findById(token.practiceId)
            .select("stripeSubscriptionStatus ownerId timezone")
            .lean();
          token.stripeSubscriptionStatus = practice?.stripeSubscriptionStatus ?? null;
          token.isPracticeOwner = practice?.ownerId?.toString() === String(token.id);
          token.timezone = practice?.timezone ?? "America/New_York";
        } else {
          token.stripeSubscriptionStatus = null;
          token.isPracticeOwner = false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.practiceId = token.practiceId ?? null;
        session.user.stripeSubscriptionStatus = token.stripeSubscriptionStatus ?? null;
        session.user.isPracticeOwner = !!token.isPracticeOwner;
        session.user.timezone = token.timezone ?? "America/New_York";
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await logAuditEvent({
        userId: user.id,
        practiceId: user.practiceId ?? undefined,
        action: AuditActions.LOGIN,
        entityType: EntityTypes.USER,
        entityId: user.id,
        details: { email: user.email },
      });
    },
    async signOut(message) {
      // JWT strategy: message has { token }. Older signatures pass { session }.
      const token = message?.token;
      const userId = token?.id;
      if (!userId) return;
      await logAuditEvent({
        userId,
        practiceId: token?.practiceId ?? undefined,
        action: AuditActions.LOGOUT,
        entityType: EntityTypes.USER,
        entityId: userId,
      });
    },
  },
});
