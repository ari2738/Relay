import { boolean, doublePrecision, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

// Role is app-level (not a Better Auth core field) — added via additionalFields
// in lib/auth.ts. Keep the three values in sync with lib/roles.ts.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("accessibility_user"),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// --- App tables ------------------------------------------------------------
// `userId` is the plain scoping column (no FK by design). It is nullable so the
// original seeded community reports (which have a reporterName but no account)
// keep working. New reports created by a logged-in user carry their id + name.

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  status: text("status").notNull().default("accessible"),
  severity: text("severity").notNull().default("medium"), // low | medium | high | critical
  title: text("title").notNull(),
  description: text("description"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  address: text("address"),
  userId: text("userId"),
  reporterName: text("reporter_name"),
  imageUrls: text("image_urls").array(),
  upvotes: integer("upvotes").notNull().default(0),
  confirmedCount: integer("confirmed_count").notNull().default(0),
  duplicateOfId: integer("duplicate_of_id"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"), // display name, shown as-is on the badge
  resolvedByUserId: text("resolved_by_user_id"), // for crediting volunteer stats
  // Priority 7: AI features. All nullable/false by default so the app works
  // identically with no ANTHROPIC_API_KEY configured — see app/actions/ai.ts.
  aiSuggestedScore: integer("ai_suggested_score"), // 0-100
  aiScoreReasoning: text("ai_score_reasoning"),
  aiFlagged: boolean("ai_flagged").notNull().default(false),
  aiFlagReason: text("ai_flag_reason"),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// One row per (report, user) — enforced by the unique index below — so a
// person can only like or confirm a given report once. Toggling removes the
// row rather than leaving a "liked: false" record around.
export const reportLikes = pgTable(
  "report_likes",
  {
    id: serial("id").primaryKey(),
    reportId: integer("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("report_likes_report_user_idx").on(t.reportId, t.userId)],
)

// Volunteer/admin verification that a report is still accurate. Distinct from
// a like: it's what drives confirmedCount and volunteer stats.
export const reportConfirmations = pgTable(
  "report_confirmations",
  {
    id: serial("id").primaryKey(),
    reportId: integer("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("report_confirmations_report_user_idx").on(t.reportId, t.userId)],
)

export const reportComments = pgTable("report_comments", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// One row per signed-in user — settings that follow the account across
// devices. Created lazily on first write (see getMyPreferences).
export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  theme: text("theme").notNull().default("system"), // "light" | "dark" | "system"
  language: text("language").notNull().default("en"),
  highContrast: boolean("high_contrast").notNull().default(false),
  reduceMotion: boolean("reduce_motion").notNull().default(false),
  notifyNearbyIssues: boolean("notify_nearby_issues").notNull().default(true),
  notifyReportResolved: boolean("notify_report_resolved").notNull().default(true),
  notifyVolunteerConfirmed: boolean("notify_volunteer_confirmed").notNull().default(true),
  notifyNewAccessiblePlace: boolean("notify_new_accessible_place").notNull().default(false),
  defaultCategories: text("default_categories").array(),
  defaultStatuses: text("default_statuses").array(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const savedPlaces = pgTable(
  "saved_places",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    reportId: integer("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("saved_places_user_report_idx").on(t.userId, t.reportId)],
)

// Upserted, not appended — one row per (user, report) holding the most
// recent visit time, so this reads as "places you've visited" rather than
// an ever-growing log.
export const visitedPlaces = pgTable(
  "visited_places",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    reportId: integer("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("visited_places_user_report_idx").on(t.userId, t.reportId)],
)

// Drives the volunteer dashboard: points ledger + recent-activity feed +
// monthly breakdown, all derived from this table rather than only from the
// denormalized counters on `reports`/`user`, so history isn't lost.
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // "confirm" | "resolve"
  reportId: integer("report_id").references(() => reports.id, { onDelete: "set null" }),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// Notifications belong to the recipient (userId). `type` is "upvote" or
// "status_change"; actorName is who triggered it; reportId/reportTitle give
// context so we can render a message without an extra join.
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  reportId: integer("report_id").notNull(),
  reportTitle: text("report_title").notNull(),
  actorName: text("actor_name"),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Report = typeof reports.$inferSelect
export type NewReport = typeof reports.$inferInsert
export type Notification = typeof notifications.$inferSelect
export type ReportComment = typeof reportComments.$inferSelect
export type ActivityLog = typeof activityLog.$inferSelect
export type UserPreferences = typeof userPreferences.$inferSelect
