"use server"

import { db } from "@/lib/db"
import { activityLog, reportConfirmations, reports, user } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { and, desc, eq, gte, sql } from "drizzle-orm"

export interface MyVolunteerStats {
  points: number
  confirmCount: number
  resolveCount: number
  rank: number | null
}

export async function getMyVolunteerStats(): Promise<MyVolunteerStats | null> {
  const me = await getCurrentUser()
  if (!me) return null

  const [row] = await db.select({ points: user.points }).from(user).where(eq(user.id, me.id))

  const [{ confirmCount }] = await db
    .select({ confirmCount: sql<number>`count(*)`.mapWith(Number) })
    .from(activityLog)
    .where(and(eq(activityLog.userId, me.id), eq(activityLog.type, "confirm")))

  const [{ resolveCount }] = await db
    .select({ resolveCount: sql<number>`count(*)`.mapWith(Number) })
    .from(activityLog)
    .where(and(eq(activityLog.userId, me.id), eq(activityLog.type, "resolve")))

  const [{ rank }] = await db
    .select({ rank: sql<number>`count(*) + 1`.mapWith(Number) })
    .from(user)
    .where(sql`${user.points} > ${row?.points ?? 0}`)

  return {
    points: row?.points ?? 0,
    confirmCount,
    resolveCount,
    rank: (row?.points ?? 0) > 0 ? rank : null,
  }
}

export interface LeaderboardEntry {
  id: string
  name: string
  image: string | null
  points: number
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({ id: user.id, name: user.name, image: user.image, points: user.points, role: user.role })
    .from(user)
    .where(sql`${user.points} > 0`)
    .orderBy(desc(user.points))
    .limit(limit)

  return rows.map((r) => ({ id: r.id, name: r.name, image: r.image, points: r.points }))
}

export interface ActivityItem {
  id: number
  type: string
  points: number
  createdAt: Date
  reportTitle: string | null
}

export async function getMyRecentActivity(limit = 15): Promise<ActivityItem[]> {
  const me = await getCurrentUser()
  if (!me) return []

  const rows = await db
    .select({
      id: activityLog.id,
      type: activityLog.type,
      points: activityLog.points,
      createdAt: activityLog.createdAt,
      reportTitle: reports.title,
    })
    .from(activityLog)
    .leftJoin(reports, eq(reports.id, activityLog.reportId))
    .where(eq(activityLog.userId, me.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)

  return rows
}

export interface MonthlyBreakdown {
  confirms: number
  resolves: number
  points: number
}

export async function getMyMonthlyBreakdown(): Promise<MonthlyBreakdown> {
  const me = await getCurrentUser()
  if (!me) return { confirms: 0, resolves: 0, points: 0 }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const rows = await db
    .select({
      type: activityLog.type,
      count: sql<number>`count(*)`.mapWith(Number),
      points: sql<number>`coalesce(sum(${activityLog.points}), 0)`.mapWith(Number),
    })
    .from(activityLog)
    .where(and(eq(activityLog.userId, me.id), gte(activityLog.createdAt, startOfMonth)))
    .groupBy(activityLog.type)

  const confirms = rows.find((r) => r.type === "confirm")?.count ?? 0
  const resolves = rows.find((r) => r.type === "resolve")?.count ?? 0
  const points = rows.reduce((sum, r) => sum + r.points, 0)

  return { confirms, resolves, points }
}

export interface ConfirmedReportItem {
  id: number
  title: string
  category: string
  status: string
  confirmedAt: Date
}

export async function getMyConfirmedReports(limit = 20): Promise<ConfirmedReportItem[]> {
  const me = await getCurrentUser()
  if (!me) return []

  const rows = await db
    .select({
      id: reports.id,
      title: reports.title,
      category: reports.category,
      status: reports.status,
      confirmedAt: reportConfirmations.createdAt,
    })
    .from(reportConfirmations)
    .innerJoin(reports, eq(reports.id, reportConfirmations.reportId))
    .where(eq(reportConfirmations.userId, me.id))
    .orderBy(desc(reportConfirmations.createdAt))
    .limit(limit)

  return rows
}
