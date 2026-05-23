import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import Practice from "@/models/practice";
import { compare } from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          await connectDB();

          const user = await User.findOne({ email: credentials.email });
          if (!user) {
            throw new Error("No user found with this email");
          }

          const isValid = await compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            practiceId: user.practiceId ? user.practiceId.toString() : null,
          };
        } catch (error) {
          throw new Error(error.message);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.practiceId = user.practiceId ?? null;
      }
      // Refresh practiceId + the Practice's Stripe status on every JWT
      // issuance so the gate reflects webhook updates without requiring the
      // user to log out. Subscription is a Practice-level concept (Round 8).
      if (token.id) {
        await connectDB();
        const freshUser = await User.findById(token.id).select("practiceId").lean();
        token.practiceId = freshUser?.practiceId ? freshUser.practiceId.toString() : null;
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
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.practiceId = token.practiceId ?? null;
        session.user.stripeSubscriptionStatus = token.stripeSubscriptionStatus ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes for active session
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days for refresh token
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
