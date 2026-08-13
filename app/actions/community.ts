"use server"

import { db } from "@/lib/db"
import {
  activityLog,
  reportComments,
  reportConfirmations,
  reportLikes,
  reports,
  user as userTable,
  type ReportComment,
} from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { notifyReporter } from "@/app/actions/notifications"
import { and, desc, eq, sql } from "drizzle-orm"

const POINTS_PER_CONFIRM = 5
const POINTS_PER_RESOLVE = 15

export async function getComments(reportId: number): Promise<ReportComment[]> {
  return db
    .select()
    .from(reportComments)
    .where(eq(reportComments.reportId, reportId))
    .orderBy(desc(reportComments.createdAt))
}

export async function addComment(reportId: number, body: string): Promise<ReportComment> {
  const text = body.trim()
  if (!text) throw new Error("Comment can't be empty")
  if (text.length > 1000) throw new Error("Comment is too long")

  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to comment")

  const [row] = await db
    .insert(reportComments)
    .values({ reportId, userId: user.id, authorName: user.name, body: text })
    .returning()
  return row
}

export async function deleteComment(commentId: number): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to delete a comment")

  const [existing] = await db.select().from(reportComments).where(eq(reportComments.id, commentId))
  if (!existing) return
  if (existing.userId !== user.id && user.role !== "admin") {
    throw new Error("You can only delete your own comments")
  }
  await db.delete(reportComments).where(eq(reportComments.id, commentId))
}

/** Toggle a per-account like. Returns the new liked state + fresh count so
 *  the client can update optimistically without a second round trip. */
export async function toggleLike(reportId: number): Promise<{ liked: boolean; count: number }> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to like a report")

  const [existing] = await db
    .select()
    .from(reportLikes)
    .where(and(eq(reportLikes.reportId, reportId), eq(reportLikes.userId, user.id)))

  if (existing) {
    await db.delete(reportLikes).where(eq(reportLikes.id, existing.id))
  } else {
    await db.insert(reportLikes).values({ reportId, userId: user.id })
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(reportLikes)
    .where(eq(reportLikes.reportId, reportId))

  return { liked: !existing, count }
}

/** Volunteer/admin verification that a report is still accurate. One
 *  confirmation per account per report; bumps the denormalized count on
 *  the report so the map/list don't need a join to show it. */
export async function confirmReport(reportId: number): Promise<{ confirmed: boolean; count: number }> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to confirm a report")
  if (user.role !== "volunteer" && user.role !== "admin") {
    throw new Error("Only volunteers can confirm reports")
  }

  const [existing] = await db
    .select()
    .from(reportConfirmations)
    .where(and(eq(reportConfirmations.reportId, reportId), eq(reportConfirmations.userId, user.id)))

  if (existing) {
    // Already confirmed by this volunteer — treat as a no-op rather than an error.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(reportConfirmations)
      .where(eq(reportConfirmations.reportId, reportId))
    return { confirmed: true, count }
  }

  await db.insert(reportConfirmations).values({ reportId, userId: user.id })
  await db
    .update(reports)
    .set({ confirmedCount: sql`${reports.confirmedCount} + 1` })
    .where(eq(reports.id, reportId))
  await db.insert(activityLog).values({ userId: user.id, type: "confirm", reportId, points: POINTS_PER_CONFIRM })
  await db
    .update(userTable)
    .set({ points: sql`${userTable.points} + ${POINTS_PER_CONFIRM}` })
    .where(eq(userTable.id, user.id))

  const [reportRow] = await db.select().from(reports).where(eq(reports.id, reportId))
  if (reportRow) {
    await notifyReporter({
      report: reportRow,
      type: "volunteer_confirmed",
      actorName: user.name,
      actorId: user.id,
    }).catch(() => {})
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(reportConfirmations)
    .where(eq(reportConfirmations.reportId, reportId))

  return { confirmed: true, count }
}

/** Volunteer/admin marks a report as fixed. Stays on the map (so its
 *  history is visible) but flips to "accessible" and carries a Resolved
 *  badge + who resolved it. */
export async function resolveReport(reportId: number): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to resolve a report")
  if (user.role !== "volunteer" && user.role !== "admin") {
    throw new Error("Only volunteers can resolve reports")
  }

  const [existing] = await db.select().from(reports).where(eq(reports.id, reportId))
  if (existing?.resolvedAt) return // already resolved — no double credit

  await db
    .update(reports)
    .set({
      status: "accessible",
      resolvedAt: new Date(),
      resolvedBy: user.name,
      resolvedByUserId: user.id,
    })
    .where(eq(reports.id, reportId))

  await db.insert(activityLog).values({ userId: user.id, type: "resolve", reportId, points: POINTS_PER_RESOLVE })
  await db
    .update(userTable)
    .set({ points: sql`${userTable.points} + ${POINTS_PER_RESOLVE}` })
    .where(eq(userTable.id, user.id))

  if (existing) {
    await notifyReporter({
      report: existing,
      type: "report_resolved",
      actorName: user.name,
      actorId: user.id,
      fromStatus: existing.status,
      toStatus: "accessible",
    }).catch(() => {})
  }
}
