/**
 * NextAuth v5 configuration for web app authentication (Google OAuth).
 *
 * Uses @auth/kysely-adapter to persist sessions and accounts in the same
 * PostgreSQL database as the rest of the app. Sessions are cookie-based and
 * web-only -- Farcaster clients authenticate via Quick Auth JWT instead
 * (see farcaster.ts).
 */
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { KyselyAdapter } from "@auth/kysely-adapter"
import { db } from "@/lib/db"
import type { NextAuthConfig } from "next-auth"

const config: NextAuthConfig = {
  // Our DB uses snake_case table names (accounts, sessions, verification_tokens)
  // while @auth/kysely-adapter expects PascalCase (Account, Session, etc.).
  // The adapter works at runtime because it generates SQL with the names we provide,
  // but the types don't match — hence the cast.
  adapter: KyselyAdapter(db as any),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
