import Link from "next/link"
import { ArrowLeft, Award, CheckCircle2, ShieldCheck, Sparkles, Trophy } from "lucide-react"
import { requireRole } from "@/lib/session"
import { computeBadges, nextPointTier } from "@/lib/badges"
import { categoryMeta } from "@/lib/relay"
import { StatusBadge } from "@/components/relay/status-badge"
import {
  getLeaderboard,
  getMyConfirmedReports,
  getMyMonthlyBreakdown,
  getMyRecentActivity,
  getMyVolunteerStats,
} from "@/app/actions/volunteer"

export const dynamic = "force-dynamic"

export default async function VolunteerPage() {
  const me = await requireRole("volunteer", "admin")

  const [stats, monthly, leaderboard, activity, confirmed] = await Promise.all([
    getMyVolunteerStats(),
    getMyMonthlyBreakdown(),
    getLeaderboard(10),
    getMyRecentActivity(15),
    getMyConfirmedReports(20),
  ])

  const points = stats?.points ?? 0
  const badges = computeBadges({
    points,
    confirmCount: stats?.confirmCount ?? 0,
    resolveCount: stats?.resolveCount ?? 0,
  })
  const next = nextPointTier(points)

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Volunteer tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thanks for keeping Relay accurate, {me.name.split(" ")[0]}.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Sparkles} label="Points" value={points} />
        <StatCard icon={Trophy} label="Rank" value={stats?.rank ? `#${stats.rank}` : "—"} />
        <StatCard icon={ShieldCheck} label="Confirmed" value={stats?.confirmCount ?? 0} />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats?.resolveCount ?? 0} />
      </div>

      {next && (
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{next.threshold - points}</strong> points to the{" "}
          <strong className="text-foreground">{next.label}</strong> badge.
        </p>
      )}

      {/* This month */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">This month</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold">{monthly.confirms}</p>
            <p className="text-xs text-muted-foreground">Confirmations</p>
          </div>
          <div>
            <p className="text-xl font-bold">{monthly.resolves}</p>
            <p className="text-xs text-muted-foreground">Resolutions</p>
          </div>
          <div>
            <p className="text-xl font-bold">{monthly.points}</p>
            <p className="text-xs text-muted-foreground">Points earned</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Badges</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center ${
                b.earned ? "border-primary/40 bg-primary/5" : "border-border opacity-50"
              }`}
            >
              <Award className={`size-5 ${b.earned ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
              <p className="text-xs font-semibold leading-tight">{b.label}</p>
              <p className="text-[10px] leading-tight text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leaderboard */}
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Leaderboard</h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No points on the board yet — be the first.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {leaderboard.map((entry, i) => (
                <li
                  key={entry.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                    entry.id === me.id ? "bg-primary/10" : "bg-card"
                  } border border-border`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-5 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate font-medium">{entry.name}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">{entry.points} pts</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent activity
          </h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Confirm or resolve a report to see activity here.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {a.type === "confirm" ? "Confirmed" : "Resolved"}{" "}
                    <span className="text-muted-foreground">{a.reportTitle ?? "a report"}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-primary">+{a.points}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Confirmed reports */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reports you&apos;ve confirmed
        </h2>
        {confirmed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing confirmed yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {confirmed.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{categoryMeta(r.category).label}</p>
                </div>
                <StatusBadge status={r.status as never} />
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
