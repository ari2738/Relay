"use server"

import { db } from "@/lib/db"
import { reports, type Report } from "@/lib/db/schema"
import { isCategoryId, isSeverityId, isStatusId } from "@/lib/relay"
import { getCurrentUser } from "@/lib/session"
import { notifyNearbySavers } from "@/app/actions/notifications"
import { runAiChecksForReport } from "@/app/actions/ai"
import { and, desc, eq, sql } from "drizzle-orm"

const MAX_ACTIVE_REPORTS = 1000

export async function getReports(): Promise<Report[]> {
  return db
    .select()
    .from(reports)
    .where(eq(reports.active, true))
    .orderBy(desc(reports.createdAt))
    .limit(MAX_ACTIVE_REPORTS)
}

export interface CreateReportInput {
  category: string
  status: string
  severity?: string
  title: string
  description?: string
  lat: number
  lng: number
  address?: string
  reporterName?: string
  expiresInHours?: number
  imageUrls?: string[]
  /** Set true to skip the duplicate check and create anyway. */
  force?: boolean
}

export interface DuplicateCandidate {
  id: number
  title: string
  category: string
  status: string
  address: string | null
  distanceMeters: number
  createdAt: Date
}

const DUPLICATE_RADIUS_METERS = 40

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

/** Same category, still active, within DUPLICATE_RADIUS_METERS of the given
 *  point. Called before create so the client can offer "confirm the existing
 *  one instead" rather than silently spawning duplicate pins. */
export async function checkDuplicates(
  category: string,
  lat: number,
  lng: number,
): Promise<DuplicateCandidate[]> {
  if (!isCategoryId(category)) return []

  // Cheap bounding-box prefilter in SQL (~1 degree lat ≈ 111km, so this box
  // is generous), then precise haversine filter in JS on the small result set.
  const box = 0.01
  const candidates = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.category, category),
        eq(reports.active, true),
        sql`${reports.lat} between ${lat - box} and ${lat + box}`,
        sql`${reports.lng} between ${lng - box} and ${lng + box}`,
      ),
    )

  return candidates
    .map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      status: r.status,
      address: r.address,
      distanceMeters: Math.round(haversineMeters([lat, lng], [r.lat, r.lng])),
      createdAt: r.createdAt,
    }))
    .filter((c) => c.distanceMeters <= DUPLICATE_RADIUS_METERS)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
}

export async function createReport(input: CreateReportInput): Promise<Report> {
  // Server-side validation — never trust the client.
  const category = isCategoryId(input.category) ? input.category : null
  const status = isStatusId(input.status) ? input.status : null
  const severity = input.severity && isSeverityId(input.severity) ? input.severity : "medium"
  const title = input.title?.trim()

  if (!category) throw new Error("Invalid category")
  if (!status) throw new Error("Invalid status")
  if (!title) throw new Error("A short title is required")
  if (title.length > 120) throw new Error("Title is too long")
  if (
    typeof input.lat !== "number" ||
    typeof input.lng !== "number" ||
    Number.isNaN(input.lat) ||
    Number.isNaN(input.lng) ||
    input.lat < -90 ||
    input.lat > 90 ||
    input.lng < -180 ||
    input.lng > 180
  ) {
    throw new Error("Invalid location")
  }

  if (!input.force) {
    const duplicates = await checkDuplicates(category, input.lat, input.lng)
    if (duplicates.length > 0) {
      // Signal to the client with a typed error so it can show the
      // duplicate-candidate picker instead of a generic failure toast.
      const err = new Error("DUPLICATE_CANDIDATES") as Error & { duplicates?: DuplicateCandidate[] }
      err.duplicates = duplicates
      throw err
    }
  }

  const imageUrls = (input.imageUrls ?? [])
    .filter((u) => typeof u === "string" && u.startsWith("https://"))
    .slice(0, 6)

  const expiresAt =
    input.expiresInHours && input.expiresInHours > 0
      ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
      : null

  // Signed-in reporters are attributed server-side (never trust the client
  // for who a report is "from") — anonymous reports keep whatever display
  // name the client sent, if any.
  const currentUser = await getCurrentUser()

  const [row] = await db
    .insert(reports)
    .values({
      category,
      status,
      severity,
      title,
      description: input.description?.trim() || null,
      lat: input.lat,
      lng: input.lng,
      address: input.address?.trim() || null,
      userId: currentUser?.id ?? null,
      reporterName: currentUser?.name ?? input.reporterName?.trim() ?? null,
      imageUrls: imageUrls.length > 0 ? imageUrls : null,
      expiresAt,
    })
    .returning()

  // Fire-and-forget from the caller's perspective, but awaited here so
  // notifications are guaranteed to land before the server action returns
  // (this runtime doesn't reliably run work after a response is sent).
  await notifyNearbySavers(row).catch(() => {})

  // AI checks (accessibility score, spam, image relevance) — silently
  // no-op if ANTHROPIC_API_KEY isn't configured. Never blocks or fails
  // report creation.
  await runAiChecksForReport(row.id, {
    category,
    status,
    severity,
    title: row.title,
    description: row.description ?? undefined,
    imageUrls,
  }).catch(() => {})

  return row
}

export interface UpdateReportInput {
  id: number
  category?: string
  status?: string
  severity?: string
  title?: string
  description?: string
  address?: string
  imageUrls?: string[]
}

/** Owner or admin only. Only the fields provided are changed. */
export async function updateReport(input: UpdateReportInput): Promise<Report> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to edit a report")

  const [existing] = await db.select().from(reports).where(eq(reports.id, input.id))
  if (!existing) throw new Error("Report not found")
  if (existing.userId !== user.id && user.role !== "admin") {
    throw new Error("You can only edit your own reports")
  }

  const patch: Partial<typeof reports.$inferInsert> = {}
  if (input.category !== undefined) {
    if (!isCategoryId(input.category)) throw new Error("Invalid category")
    patch.category = input.category
  }
  if (input.status !== undefined) {
    if (!isStatusId(input.status)) throw new Error("Invalid status")
    patch.status = input.status
  }
  if (input.severity !== undefined) {
    if (!isSeverityId(input.severity)) throw new Error("Invalid severity")
    patch.severity = input.severity
  }
  if (input.title !== undefined) {
    const title = input.title.trim()
    if (!title) throw new Error("A short title is required")
    if (title.length > 120) throw new Error("Title is too long")
    patch.title = title
  }
  if (input.description !== undefined) patch.description = input.description.trim() || null
  if (input.address !== undefined) patch.address = input.address.trim() || null
  if (input.imageUrls !== undefined) {
    const imageUrls = input.imageUrls.filter((u) => u.startsWith("https://")).slice(0, 6)
    patch.imageUrls = imageUrls.length > 0 ? imageUrls : null
  }

  const [row] = await db.update(reports).set(patch).where(eq(reports.id, input.id)).returning()
  return row
}

/** Owner or admin only. Soft delete — removes it from the live map without
 *  destroying history other tables (comments, likes) reference. */
export async function deleteReport(id: number): Promise<void> {
  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to delete a report")

  const [existing] = await db.select().from(reports).where(eq(reports.id, id))
  if (!existing) throw new Error("Report not found")
  if (existing.userId !== user.id && user.role !== "admin") {
    throw new Error("You can only delete your own reports")
  }

  await db.update(reports).set({ active: false }).where(eq(reports.id, id))
}

/** Anonymous, un-deduplicated quick-confirm — kept for parity with the
 *  original app so signed-out visitors can still bump a report. Signed-in
 *  users get the deduplicated per-account version, toggleLike(), instead. */
export async function upvoteReport(id: number): Promise<Report> {
  if (!Number.isInteger(id)) throw new Error("Invalid report id")
  const [row] = await db
    .update(reports)
    .set({ upvotes: sql`${reports.upvotes} + 1` })
    .where(and(eq(reports.id, id), eq(reports.active, true)))
    .returning()
  if (!row) throw new Error("Report not found")
  return row
}
