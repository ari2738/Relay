"use server"

import { db } from "@/lib/db"
import { userPreferences, type UserPreferences } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { eq } from "drizzle-orm"

const DEFAULTS: Omit<UserPreferences, "userId" | "updatedAt"> = {
  theme: "system",
  language: "en",
  highContrast: false,
  reduceMotion: false,
  notifyNearbyIssues: true,
  notifyReportResolved: true,
  notifyVolunteerConfirmed: true,
  notifyNewAccessiblePlace: false,
  defaultCategories: null,
  defaultStatuses: null,
}

export async function getMyPreferences(): Promise<UserPreferences | null> {
  const me = await getCurrentUser()
  if (!me) return null

  const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, me.id))
  if (row) return row

  // Lazily create the row on first read so every account has one without
  // needing a signup-time insert.
  const [created] = await db.insert(userPreferences).values({ userId: me.id, ...DEFAULTS }).returning()
  return created
}

export type PreferencesPatch = Partial<Omit<UserPreferences, "userId" | "updatedAt">>

export async function updateMyPreferences(patch: PreferencesPatch): Promise<UserPreferences> {
  const me = await getCurrentUser()
  if (!me) throw new Error("Sign in to change settings")

  await db
    .insert(userPreferences)
    .values({ userId: me.id, ...DEFAULTS, ...patch })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...patch, updatedAt: new Date() },
    })

  const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, me.id))
  return row
}
