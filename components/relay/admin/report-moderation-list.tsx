"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/relay/status-badge"
import { categoryMeta } from "@/lib/relay"
import { purgeReport, restoreReport, type AdminReportRow } from "@/app/actions/admin"

export function ReportModerationList({ initialReports }: { initialReports: AdminReportRow[] }) {
  const [reports, setReports] = useState(initialReports)
  const [filter, setFilter] = useState<"all" | "active" | "removed" | "flagged">("active")

  const visible = reports.filter((r) => {
    if (filter === "active") return r.active
    if (filter === "removed") return !r.active
    if (filter === "flagged") return r.aiFlagged
    return true
  })

  async function handleRestore(id: number) {
    setReports((cur) => cur.map((r) => (r.id === id ? { ...r, active: true } : r))) // optimistic
    try {
      await restoreReport(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore")
    }
  }

  async function handlePurge(id: number) {
    if (!confirm("Permanently delete this report and its comments? This can't be undone.")) return
    const prev = reports
    setReports((cur) => cur.filter((r) => r.id !== id)) // optimistic
    try {
      await purgeReport(id)
    } catch (err) {
      setReports(prev)
      toast.error(err instanceof Error ? err.message : "Could not delete")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {(["active", "removed", "flagged", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {visible.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {r.title}
                {!r.active && <span className="ml-1.5 text-xs font-normal text-destructive">(removed)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {categoryMeta(r.category).label} · {r.reporterName ?? "Anonymous"} · {r.upvotes} confirms
                {r.aiSuggestedScore != null && <> · AI score {r.aiSuggestedScore}/100</>}
              </p>
              {r.aiFlagged && (
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertTriangle className="size-3" aria-hidden="true" />
                  Flagged{r.aiFlagReason ? `: ${r.aiFlagReason}` : ""}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={r.status as never} />
              {r.active ? (
                <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => handlePurge(r.id)}>
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Purge
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleRestore(r.id)}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Restore
                </Button>
              )}
            </div>
          </li>
        ))}
        {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing here.</p>}
      </ul>
    </div>
  )
}
