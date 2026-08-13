import Link from "next/link"
import { ArrowLeft, Clock3, FileText, Flame, ShieldCheck, Users } from "lucide-react"
import { requireRole } from "@/lib/session"
import { getAdminStats, getAllUsers, getReportsForModeration } from "@/app/actions/admin"
import { categoryMeta } from "@/lib/relay"
import { ROLE_META } from "@/lib/roles"
import { UserTable } from "@/components/relay/admin/user-table"
import { ReportModerationList } from "@/components/relay/admin/report-moderation-list"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  await requireRole("admin")

  const [stats, users, moderationReports] = await Promise.all([
    getAdminStats(),
    getAllUsers(),
    getReportsForModeration(true),
  ])

  const weekDelta = stats.reportsThisWeek - stats.reportsLastWeek
  const maxCategoryCount = Math.max(1, ...stats.byCategory.map((c) => c.count))
  const maxStatusCount = Math.max(1, ...stats.byStatus.map((s) => s.count))

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <Link href="/admin/heatmap" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <Flame className="size-4" aria-hidden="true" />
          Accessibility heatmap
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide overview and moderation tools.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.totalUsers} />
        <StatCard icon={FileText} label="Active reports" value={stats.activeReports} />
        <StatCard icon={ShieldCheck} label="Resolved" value={stats.resolvedReports} />
        <StatCard
          icon={Clock3}
          label="Avg. resolution"
          value={stats.avgResolutionHours != null ? `${stats.avgResolutionHours.toFixed(1)}h` : "—"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week</p>
          <p className="mt-1 text-2xl font-bold">{stats.reportsThisWeek} reports</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {weekDelta === 0 ? "Same as" : weekDelta > 0 ? `+${weekDelta} more than` : `${weekDelta} fewer than`} last
            week ({stats.reportsLastWeek})
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Users by role</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {(Object.keys(stats.usersByRole) as (keyof typeof stats.usersByRole)[]).map((r) => (
              <span key={r}>
                <span className="font-semibold">{stats.usersByRole[r]}</span>{" "}
                <span className="text-muted-foreground">{ROLE_META[r].label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">By category</h2>
          <div className="flex flex-col gap-2">
            {stats.byCategory.map((c) => (
              <BarRow key={c.category} label={categoryMeta(c.category).label} count={c.count} max={maxCategoryCount} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">By status</h2>
          <div className="flex flex-col gap-2">
            {stats.byStatus.map((s) => (
              <BarRow key={s.status} label={s.status} count={s.count} max={maxStatusCount} />
            ))}
          </div>
        </div>
      </div>

      {/* Users */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">User management</h2>
        <UserTable initialUsers={users} />
      </div>

      {/* Report moderation */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Report moderation
        </h2>
        <ReportModerationList initialReports={moderationReports} />
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

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 truncate capitalize text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right font-semibold">{count}</span>
    </div>
  )
}
