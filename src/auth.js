import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Practice from "@/models/practice";

// Auth.js v5 — pure swap of NextAuth v4. Session shape, callbacks behavior,
// and timing are preserved from the v4 config that lived in
// src/app/api/auth/[...nextauth]/route.js.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 60 }, // 30-min active session
  jwt: { maxAge: 30 * 24 * 60 * 60 }, // 30-day refresh
  pages: { signIn: "/login", error: "/login" },
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
            .select("stripeSubscriptionStatus")
            .lean();
          token.stripeSubscriptionStatus = practice?.stripeSubscriptionStatus ?? null;
        } else {
          token.stripeSubscriptionStatus = null;
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
      }
      return session;
    },
  },
});
