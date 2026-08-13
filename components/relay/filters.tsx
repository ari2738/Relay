"use client"

import { cn } from "@/lib/utils"
import { CATEGORIES, STATUSES, type CategoryId, type StatusId } from "@/lib/relay"
import { CATEGORY_ICON, STATUS_CLASSES } from "./icons"

interface FiltersProps {
  activeCategories: Set<CategoryId>
  activeStatuses: Set<StatusId>
  toggleCategory: (id: CategoryId) => void
  toggleStatus: (id: StatusId) => void
  counts: Record<string, number>
}

export function Filters({
  activeCategories,
  activeStatuses,
  toggleCategory,
  toggleStatus,
  counts,
}: FiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICON[cat.id]
            const active = activeCategories.has(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {cat.short}
                <span className={cn("text-xs", active ? "opacity-80" : "opacity-60")}>{counts[cat.id] ?? 0}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const active = activeStatuses.has(s.id)
            const c = STATUS_CLASSES[s.id]
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStatus(s.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "border-transparent text-white" : "border-border bg-card text-muted-foreground hover:border-primary/50",
                )}
                style={active ? { backgroundColor: c.hex } : undefined}
              >
                <span
                  className={cn("size-2 rounded-full", active ? "bg-white/90" : "")}
                  style={active ? undefined : { backgroundColor: c.hex }}
                  aria-hidden="true"
                />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
