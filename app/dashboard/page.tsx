import Link from "next/link"
import { ArrowLeft, MapPin, ShieldCheck, ThumbsUp, Users } from "lucide-react"
import { and, eq, sql } from "drizzle-orm"
import { requireRole } from "@/lib/session"
import { db } from "@/lib/db"
import { reports } from "@/lib/db/schema"
import { ROLE_META } from "@/lib/roles"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await requireRole()

  const [stats] = await db
    .select({
      reportCount: sql<number>`count(*)`.mapWith(Number),
      upvoteTotal: sql<number>`coalesce(sum(${reports.upvotes}), 0)`.mapWith(Number),
    })
    .from(reports)
    .where(and(eq(reports.userId, user.id), eq(reports.active, true)))

  const myReports = await db
    .select()
    .from(reports)
    .where(and(eq(reports.userId, user.id), eq(reports.active, true)))
    .orderBy(sql`${reports.createdAt} desc`)
    .limit(5)

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to map
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{ROLE_META[user.role].description}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={MapPin} label="Your reports" value={stats?.reportCount ?? 0} />
        <StatCard icon={ThumbsUp} label="Confirmations received" value={stats?.upvoteTotal ?? 0} />
        <StatCard icon={ShieldCheck} label="Role" value={ROLE_META[user.role].label} />
      </div>

      {(user.role === "volunteer" || user.role === "admin") && (
        <div className="flex flex-wrap gap-2">
          {user.role === "volunteer" && (
            <Link href="/volunteer" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
              <Users className="size-4" aria-hidden="true" />
              Volunteer tools
            </Link>
          )}
          {user.role === "admin" && (
            <Link href="/admin" className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Admin dashboard
            </Link>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your recent reports
        </h2>
        {myReports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            You haven&apos;t reported a spot yet.{" "}
            <Link href="/" className="font-medium text-primary hover:underline">
              Add one on the map
            </Link>
            .
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {myReports.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.address ?? "No address"}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <ThumbsUp className="size-3" aria-hidden="true" />
                  {r.upvotes}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="mb-2 size-4 text-primary" aria-hidden="true" />
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
