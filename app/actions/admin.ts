"use server"

import { db } from "@/lib/db"
import { reports, user } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { isRole, type Role } from "@/lib/roles"
import { and, count, desc, eq, gte, sql } from "drizzle-orm"

async function requireAdmin() {
  const me = await getCurrentUser()
  if (!me) throw new Error("Sign in required")
  if (me.role !== "admin") throw new Error("Admins only")
  return me
}

export interface AdminStats {
  totalUsers: number
  usersByRole: Record<Role, number>
  totalReports: number
  activeReports: number
  resolvedReports: number
  reportsThisWeek: number
  reportsLastWeek: number
  avgResolutionHours: number | null
  byCategory: { category: string; count: number }[]
  byStatus: { status: string; count: number }[]
}

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin()

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [totalUsersRow] = await db.select({ n: count() }).from(user)
  const roleRows = await db.select({ role: user.role, n: count() }).from(user).groupBy(user.role)
  const usersByRole: Record<Role, number> = { accessibility_user: 0, volunteer: 0, admin: 0 }
  for (const r of roleRows) {
    if (isRole(r.role)) usersByRole[r.role] = r.n
  }

  const [totalReportsRow] = await db.select({ n: count() }).from(reports)
  const [activeReportsRow] = await db.select({ n: count() }).from(reports).where(eq(reports.active, true))
  const [resolvedRow] = await db
    .select({ n: count() })
    .from(reports)
    .where(sql`${reports.resolvedAt} is not null`)

  const [thisWeekRow] = await db.select({ n: count() }).from(reports).where(gte(reports.createdAt, weekAgo))
  const [lastWeekRow] = await db
    .select({ n: count() })
    .from(reports)
    .where(and(gte(reports.createdAt, twoWeeksAgo), sql`${reports.createdAt} < ${weekAgo}`))

  const [avgRow] = await db
    .select({
      avgHours: sql<number | null>`avg(extract(epoch from (${reports.resolvedAt} - ${reports.createdAt})) / 3600)`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
    })
    .from(reports)
    .where(sql`${reports.resolvedAt} is not null`)

  const byCategory = await db
    .select({ category: reports.category, count: count() })
    .from(reports)
    .where(eq(reports.active, true))
    .groupBy(reports.category)
    .orderBy(desc(count()))

  const byStatus = await db
    .select({ status: reports.status, count: count() })
    .from(reports)
    .where(eq(reports.active, true))
    .groupBy(reports.status)
    .orderBy(desc(count()))

  return {
    totalUsers: totalUsersRow?.n ?? 0,
    usersByRole,
    totalReports: totalReportsRow?.n ?? 0,
    activeReports: activeReportsRow?.n ?? 0,
    resolvedReports: resolvedRow?.n ?? 0,
    reportsThisWeek: thisWeekRow?.n ?? 0,
    reportsLastWeek: lastWeekRow?.n ?? 0,
    avgResolutionHours: avgRow?.avgHours ?? null,
    byCategory,
    byStatus,
  }
}

export interface AdminUserRow {
  id: string
  name: string
  email: string
  role: Role
  points: number
  createdAt: Date
}

export async function getAllUsers(search?: string): Promise<AdminUserRow[]> {
  await requireAdmin()

  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, points: user.points, createdAt: user.createdAt })
    .from(user)
    .where(search ? sql`${user.name} ilike ${"%" + search + "%"} or ${user.email} ilike ${"%" + search + "%"}` : undefined)
    .orderBy(desc(user.createdAt))
    .limit(200)

  return rows.map((r) => ({ ...r, role: isRole(r.role) ? r.role : "accessibility_user" }))
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  const me = await requireAdmin()
  if (userId === me.id && role !== "admin") {
    throw new Error("You can't remove your own admin access")
  }
  await db.update(user).set({ role }).where(eq(user.id, userId))
}

export interface AdminReportRow {
  id: number
  title: string
  category: string
  status: string
  severity: string
  active: boolean
  resolvedAt: Date | null
  reporterName: string | null
  upvotes: number
  confirmedCount: number
  createdAt: Date
  aiFlagged: boolean
  aiFlagReason: string | null
  aiSuggestedScore: number | null
}

export async function getReportsForModeration(includeInactive = true): Promise<AdminReportRow[]> {
  await requireAdmin()

  const rows = await db
    .select({
      id: reports.id,
      title: reports.title,
      category: reports.category,
      status: reports.status,
      severity: reports.severity,
      active: reports.active,
      resolvedAt: reports.resolvedAt,
      reporterName: reports.reporterName,
      upvotes: reports.upvotes,
      confirmedCount: reports.confirmedCount,
      createdAt: reports.createdAt,
      aiFlagged: reports.aiFlagged,
      aiFlagReason: reports.aiFlagReason,
      aiSuggestedScore: reports.aiSuggestedScore,
    })
    .from(reports)
    .where(includeInactive ? undefined : eq(reports.active, true))
    .orderBy(desc(reports.createdAt))
    .limit(300)

  return rows
}

/** Admin-only hard moderation action — permanently removes a report and
 *  everything attached to it (comments/likes/confirmations cascade via FK).
 *  Use deleteReport() from reports.ts for the normal soft-delete instead;
 *  this is for spam/abuse cleanup. */
export async function purgeReport(id: number): Promise<void> {
  await requireAdmin()
  await db.delete(reports).where(eq(reports.id, id))
}

export async function restoreReport(id: number): Promise<void> {
  await requireAdmin()
  await db.update(reports).set({ active: true }).where(eq(reports.id, id))
}

export interface HeatmapPoint {
  lat: number
  lng: number
  status: string
}

export async function getHeatmapPoints(): Promise<HeatmapPoint[]> {
  await requireAdmin()
  return db
    .select({ lat: reports.lat, lng: reports.lng, status: reports.status })
    .from(reports)
    .where(eq(reports.active, true))
}
