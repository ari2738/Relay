import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/lib/db"
import * as schema from "@/lib/db/schema"
import { SELF_SERVICE_ROLES } from "@/lib/roles"

const hasGoogleOAuth = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export const auth = betterAuth({
  trustedOrigins: [
    "http://localhost:3000",
    process.env.BETTER_AUTH_URL!,
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  // Google OAuth only registers when credentials are present so the app
  // still boots (and Credentials login still works) without them configured.
  socialProviders: hasGoogleOAuth
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "accessibility_user",
        input: true, // allow the client to send it at sign-up
      },
      points: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false, // never trust the client to set their own points
      },
    },
  },

  // Google sign-ups don't pass through our sign-up form, so they'd otherwise
  // land with no role. Default/validate it here regardless of sign-up path.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const incomingRole = (user as unknown as { role?: unknown }).role
          const role =
            typeof incomingRole === "string" &&
            SELF_SERVICE_ROLES.includes(incomingRole as (typeof SELF_SERVICE_ROLES)[number])
              ? incomingRole
              : "accessibility_user"
          return { data: { ...user, role } }
        },
      },
    },
  },

  // Must be the last plugin — it sets auth cookies via Next's cookies() API.
  plugins: [nextCookies()],
})

export type Session = typeof auth.$Infer.Session
