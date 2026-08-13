"use server"

import { db } from "@/lib/db"
import { reports, savedPlaces, visitedPlaces } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { and, desc, eq } from "drizzle-orm"

export async function toggleSavedPlace(reportId: number): Promise<{ saved: boolean }> {
  const me = await getCurrentUser()
  if (!me) throw new Error("Sign in to save places")

  const [existing] = await db
    .select()
    .from(savedPlaces)
    .where(and(eq(savedPlaces.userId, me.id), eq(savedPlaces.reportId, reportId)))

  if (existing) {
    await db.delete(savedPlaces).where(eq(savedPlaces.id, existing.id))
    return { saved: false }
  }

  await db.insert(savedPlaces).values({ userId: me.id, reportId })
  return { saved: true }
}

export async function isSaved(reportId: number): Promise<boolean> {
  const me = await getCurrentUser()
  if (!me) return false
  const [existing] = await db
    .select()
    .from(savedPlaces)
    .where(and(eq(savedPlaces.userId, me.id), eq(savedPlaces.reportId, reportId)))
  return Boolean(existing)
}

export interface SavedPlaceItem {
  id: number
  title: string
  category: string
  status: string
  address: string | null
  savedAt: Date
}

export async function getMySavedPlaces(): Promise<SavedPlaceItem[]> {
  const me = await getCurrentUser()
  if (!me) return []

  const rows = await db
    .select({
      id: reports.id,
      title: reports.title,
      category: reports.category,
      status: reports.status,
      address: reports.address,
      savedAt: savedPlaces.createdAt,
    })
    .from(savedPlaces)
    .innerJoin(reports, eq(reports.id, savedPlaces.reportId))
    .where(eq(savedPlaces.userId, me.id))
    .orderBy(desc(savedPlaces.createdAt))

  return rows
}

/** Upserts the visit timestamp — silently no-ops for signed-out visitors so
 *  callers don't need to branch on auth state before calling this. */
export async function recordVisit(reportId: number): Promise<void> {
  const me = await getCurrentUser()
  if (!me) return

  await db
    .insert(visitedPlaces)
    .values({ userId: me.id, reportId })
    .onConflictDoUpdate({
      target: [visitedPlaces.userId, visitedPlaces.reportId],
      set: { visitedAt: new Date() },
    })
}

export interface VisitedPlaceItem {
  id: number
  title: string
  category: string
  status: string
  visitedAt: Date
}

export async function getMyVisitedPlaces(): Promise<VisitedPlaceItem[]> {
  const me = await getCurrentUser()
  if (!me) return []

  const rows = await db
    .select({
      id: reports.id,
      title: reports.title,
      category: reports.category,
      status: reports.status,
      visitedAt: visitedPlaces.visitedAt,
    })
    .from(visitedPlaces)
    .innerJoin(reports, eq(reports.id, visitedPlaces.reportId))
    .where(eq(visitedPlaces.userId, me.id))
    .orderBy(desc(visitedPlaces.visitedAt))
    .limit(30)

  return rows
}
