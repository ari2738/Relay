"use client"

import { useEffect, useState } from "react"
import { ImageIcon, MapPin, MessageCircle, ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Report } from "@/lib/db/schema"
import { categoryMeta, type CategoryId, type StatusId } from "@/lib/relay"
import { CATEGORY_ICON, STATUS_CLASSES } from "./icons"
import { StatusBadge } from "./status-badge"

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

// Relative time depends on the current clock, so it differs between the server
// render and client hydration. Render a stable absolute date first, then swap
// to the relative string after mount to avoid a hydration mismatch.
function RelativeTime({ date }: { date: Date }) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    setLabel(timeAgo(date))
    const interval = setInterval(() => setLabel(timeAgo(date)), 60000)
    return () => clearInterval(interval)
  }, [date])

  return (
    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
      {label ?? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  )
}

interface ReportCardProps {
  report: Report
  selected: boolean
  onSelect: () => void
  onUpvote: () => void
  onOpenDetails: () => void
}

export function ReportCard({ report, selected, onSelect, onUpvote, onOpenDetails }: ReportCardProps) {
  const cat = categoryMeta(report.category)
  const Icon = CATEGORY_ICON[report.category as CategoryId]
  const statusColor = STATUS_CLASSES[report.status as StatusId]

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-pressed={selected}
      className={cn(
        "group flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors",
        "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary ring-2 ring-primary/40",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg text-white",
          statusColor.bg,
        )}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold leading-tight text-card-foreground">{report.title}</p>
        </div>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{cat.label}</p>

        {report.address && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{report.address}</span>
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <StatusBadge status={report.status as StatusId} />
          <div className="flex items-center gap-2">
            <RelativeTime date={report.createdAt} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onUpvote()
              }}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Confirm this report is still accurate. ${report.upvotes} confirmations`}
            >
              <ThumbsUp className="size-3.5" aria-hidden="true" />
              {report.upvotes}
            </button>
          </div>
        </div>

        {(report.imageUrls?.length || selected) && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {report.imageUrls && report.imageUrls.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <ImageIcon className="size-3" aria-hidden="true" />
                  {report.imageUrls.length}
                </span>
              )}
            </div>
            {selected && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenDetails()
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageCircle className="size-3.5" aria-hidden="true" />
                Details &amp; comments
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
