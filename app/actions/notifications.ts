"use server"

import { db } from "@/lib/db"
import { notifications, savedPlaces, reports, userPreferences, type Notification, type Report } from "@/lib/db/schema"
import { getCurrentUser } from "@/lib/session"
import { NEARBY_RADIUS_METERS, type NotificationType } from "@/lib/notifications"
import { and, desc, eq, sql } from "drizzle-orm"

export async function getMyNotifications(limit = 30): Promise<Notification[]> {
  const me = await getCurrentUser()
  if (!me) return []
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, me.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

export async function getUnreadCount(): Promise<number> {
  const me = await getCurrentUser()
  if (!me) return 0
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(notifications)
    .where(and(eq(notifications.userId, me.id), eq(notifications.read, false)))
  return row?.count ?? 0
}

export async function markNotificationRead(id: number): Promise<void> {
  const me = await getCurrentUser()
  if (!me) return
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, me.id)))
}

export async function markAllNotificationsRead(): Promise<void> {
  const me = await getCurrentUser()
  if (!me) return
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, me.id))
}

/** Internal helper (not user-invocable) used by other server actions —
 *  confirm/resolve/create — to raise a notification. Respects the
 *  recipient's notification preferences; defaults to "on" if they've never
 *  visited /account, except new_accessible_place which defaults off. */
async function notifyUser(opts: {
  userId: string
  type: NotificationType
  reportId: number
  reportTitle: string
  actorName?: string
  fromStatus?: string
  toStatus?: string
}) {
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, opts.userId))

  const enabled =
    !prefs
      ? opts.type !== "new_accessible_place"
      : opts.type === "nearby_issue"
        ? prefs.notifyNearbyIssues
        : opts.type === "report_resolved"
          ? prefs.notifyReportResolved
          : opts.type === "volunteer_confirmed"
            ? prefs.notifyVolunteerConfirmed
            : prefs.notifyNewAccessiblePlace

  if (!enabled) return

  await db.insert(notifications).values({
    userId: opts.userId,
    type: opts.type,
    reportId: opts.reportId,
    reportTitle: opts.reportTitle,
    actorName: opts.actorName ?? null,
    fromStatus: opts.fromStatus ?? null,
    toStatus: opts.toStatus ?? null,
  })
}

/** Confirm/resolve wrapper — notifies the report's original reporter, if
 *  it has one and they weren't the one taking the action. */
export async function notifyReporter(opts: {
  report: Pick<Report, "id" | "title" | "userId">
  type: Extract<NotificationType, "report_resolved" | "volunteer_confirmed">
  actorName: string
  actorId: string
  fromStatus?: string
  toStatus?: string
}) {
  if (!opts.report.userId || opts.report.userId === opts.actorId) return
  await notifyUser({
    userId: opts.report.userId,
    type: opts.type,
    reportId: opts.report.id,
    reportTitle: opts.report.title,
    actorName: opts.actorName,
    fromStatus: opts.fromStatus,
    toStatus: opts.toStatus,
  })
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Called right after a report is created. Finds everyone who has bookmarked
 *  a *different* place within NEARBY_RADIUS_METERS of the new report and
 *  notifies them — "issue" for limited/blocked reports, "new accessible
 *  place" for accessible ones. */
export async function notifyNearbySavers(report: Report) {
  const type: NotificationType = report.status === "accessible" ? "new_accessible_place" : "nearby_issue"

  // Bounding-box prefilter (~0.01deg ≈ 1.1km, generous for a 750m radius) via
  // the saved reports' own coordinates, then precise haversine on the small
  // candidate set — same pattern as duplicate detection in reports.ts.
  const box = 0.01
  const candidates = await db
    .select({ userId: savedPlaces.userId, lat: reports.lat, lng: reports.lng })
    .from(savedPlaces)
    .innerJoin(reports, eq(reports.id, savedPlaces.reportId))
    .where(
      and(
        sql`${reports.lat} between ${report.lat - box} and ${report.lat + box}`,
        sql`${reports.lng} between ${report.lng - box} and ${report.lng + box}`,
      ),
    )

  const notified = new Set<string>()
  for (const c of candidates) {
    if (notified.has(c.userId) || c.userId === report.userId) continue
    if (haversineMeters([report.lat, report.lng], [c.lat, c.lng]) > NEARBY_RADIUS_METERS) continue
    notified.add(c.userId)
    await notifyUser({ userId: c.userId, type, reportId: report.id, reportTitle: report.title })
  }
}
