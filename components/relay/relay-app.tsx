"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { List, MapPin, Plus, Route, X } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CATEGORIES, STATUSES, type CategoryId, type StatusId } from "@/lib/relay"
import type { Report } from "@/lib/db/schema"
import { createReport, getReports, updateReport, upvoteReport, type CreateReportInput, type UpdateReportInput } from "@/app/actions/reports"
import { confirmReport } from "@/app/actions/community"
import { Filters } from "./filters"
import { ReportCard } from "./report-card"
import { ReportDialog } from "./report-dialog"
import { ReportDetailDialog } from "./report-detail-dialog"
import { AuthWidget } from "./auth-widget"
import { ThemeToggle } from "./theme-toggle"
import { NotificationBell } from "./notification-bell"
import { PrefsSync } from "./prefs-sync"

const MapView = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-muted text-sm text-muted-foreground">Loading map…</div>
  ),
})

const ALL_CATEGORIES = new Set<CategoryId>(CATEGORIES.map((c) => c.id))
const ALL_STATUSES = new Set<StatusId>(STATUSES.map((s) => s.id))

export function RelayApp({ initialReports }: { initialReports: Report[] }) {
  const { data: reports = [], mutate } = useSWR<Report[]>("reports", getReports, {
    fallbackData: initialReports,
    revalidateOnFocus: false,
  })

  const [activeCategories, setActiveCategories] = useState<Set<CategoryId>>(new Set(ALL_CATEGORIES))
  const [activeStatuses, setActiveStatuses] = useState<Set<StatusId>>(new Set(ALL_STATUSES))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [placing, setPlacing] = useState(false)
  const [pending, setPending] = useState<[number, number] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [dark, setDark] = useState(true)
  const [detailReport, setDetailReport] = useState<Report | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) => activeCategories.has(r.category as CategoryId) && activeStatuses.has(r.status as StatusId),
      ),
    [reports, activeCategories, activeStatuses],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of reports) c[r.category] = (c[r.category] ?? 0) + 1
    return c
  }, [reports])

  const blockerCount = useMemo(() => reports.filter((r) => r.status === "blocked").length, [reports])

  const toggleCategory = useCallback((id: CategoryId) => {
    setActiveCategories((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleStatus = useCallback((id: StatusId) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const startPlacing = useCallback(() => {
    setPlacing(true)
    setPending(null)
    setSelectedId(null)
    setPanelOpen(false)

    toast("Tap the map to drop your pin", {
      description: "Then fill in a few quick details.",
    })
  }, [])

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (placing) {
        setPending([lat, lng])
        setPlacing(false)
        setDialogOpen(true)
      } else {
        setSelectedId(null)
      }
    },
    [placing],
  )

  const handleSubmit = useCallback(
    async (input: CreateReportInput) => {
      const created = await createReport(input)
      await mutate((prev) => [created, ...(prev ?? [])], { revalidate: false })
      setPending(null)
      setSelectedId(created.id)
      toast.success("Report added", { description: "Thanks for helping the community." })
    },
    [mutate],
  )

  const handleUpvote = useCallback(
    async (id: number) => {
      // Optimistic bump.
      await mutate(
        (prev) => (prev ?? []).map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r)),
        { revalidate: false },
      )
      try {
        const updated = await upvoteReport(id)
        await mutate((prev) => (prev ?? []).map((r) => (r.id === id ? updated : r)), { revalidate: false })
      } catch {
        await mutate()
        toast.error("Could not save your confirmation")
      }
    },
    [mutate],
  )

  const handleUpdate = useCallback(
    async (id: number, patch: Omit<UpdateReportInput, "id">) => {
      const updated = await updateReport({ id, ...patch })
      await mutate((prev) => (prev ?? []).map((r) => (r.id === id ? updated : r)), { revalidate: false })
    },
    [mutate],
  )

  const handleDeleted = useCallback(
    (id: number) => {
      mutate((prev) => (prev ?? []).filter((r) => r.id !== id), { revalidate: false })
      setSelectedId((cur) => (cur === id ? null : cur))
      setDetailReport(null)
    },
    [mutate],
  )

  const handleResolved = useCallback(
    (id: number) => {
      mutate(
        (prev) =>
          (prev ?? []).map((r) =>
            r.id === id ? { ...r, status: "accessible", resolvedAt: new Date() } : r,
          ),
        { revalidate: false },
      )
    },
    [mutate],
  )

  const openDetails = useCallback((report: Report) => {
    setDetailReport(report)
    setDetailOpen(true)
  }, [])

  const handleConfirmExisting = useCallback(
    async (id: number) => {
      setSelectedId(id)
      try {
        await confirmReport(id)
        await mutate()
        toast.success("Confirmed the existing spot instead")
      } catch {
        // Non-volunteers can't confirm — that's fine, an anonymous upvote
        // still records that someone found this spot again.
        await handleUpvote(id)
      }
    },
    [mutate, handleUpvote],
  )


  const panelContent = (
    <div className="flex h-full flex-col gap-4">
      <Filters
        activeCategories={activeCategories}
        activeStatuses={activeStatuses}
        toggleCategory={toggleCategory}
        toggleStatus={toggleStatus}
        counts={counts}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "spot" : "spots"}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No spots match your filters.
          </div>
        ) : (
          filtered.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              selected={r.id === selectedId}
              onSelect={() => {
                setSelectedId(r.id)
                setPanelOpen(false)
              }}
              onUpvote={() => handleUpvote(r.id)}
              onOpenDetails={() => openDetails(r)}
            />
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Toaster position="top-center" richColors />
      <PrefsSync
        onLoaded={(prefs) => {
          if (prefs.defaultCategories && prefs.defaultCategories.length > 0) {
            setActiveCategories(new Set(prefs.defaultCategories as CategoryId[]))
          }
          if (prefs.defaultStatuses && prefs.defaultStatuses.length > 0) {
            setActiveStatuses(new Set(prefs.defaultStatuses as StatusId[]))
          }
        }}
      />

      {/* Header */}
      <header className="z-[600] flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Route className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight">Relay</h1>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              Community accessibility map
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="mr-1 hidden items-center gap-3 text-xs text-muted-foreground md:flex">
            <span>
              <strong className="text-foreground">{reports.length}</strong> spots
            </span>
            {blockerCount > 0 && (
              <span className="text-blocked">
                <strong>{blockerCount}</strong> blocked
              </span>
            )}
          </div>
          <Button
            onClick={startPlacing}
            className="gap-1.5"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Report a spot</span>
            <span className="sm:hidden">Report</span>
          </Button>
          <ThemeToggle />
          <NotificationBell />
          <div className="ml-1 border-l border-border pl-2">
            <AuthWidget />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-[380px] shrink-0 flex-col border-r border-border bg-background p-4 lg:flex">
          {panelContent}
        </aside>

        {/* Map area */}
        <div className="relative flex-1">
          <MapView
            reports={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            placing={placing}
            pending={pending}
            onMapClick={handleMapClick}
            dark={dark}
          />

          {/* Placing banner */}
          {placing && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-center p-3">
              <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-primary/40 bg-card px-4 py-2 text-sm shadow-lg">
                <MapPin className="size-4 text-primary" aria-hidden="true" />
                <span className="font-medium">Tap the map to drop your pin</span>
                <button
                  type="button"
                  onClick={() => setPlacing(false)}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Cancel placing"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* Mobile: open list button */}
          <div className="absolute bottom-4 right-4 z-[500] lg:hidden">
            <Button
              variant="secondary"
              onClick={() => setPanelOpen(true)}
              className="gap-1.5 shadow-lg"
            >
              <List className="size-4" aria-hidden="true" />
              List
            </Button>
          </div>
        </div>

        {/* Mobile bottom sheet */}
        {panelOpen && (
          <div className="absolute inset-0 z-[700] lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPanelOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[80%] rounded-t-2xl border-t border-border bg-background p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Spots nearby</h2>
                <button
                  type="button"
                  onClick={() => setPanelOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Close list"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="h-[60vh]">{panelContent}</div>
            </div>
          </div>
        )}
      </div>

      <ReportDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setPending(null)
        }}
        coords={pending}
        onSubmit={handleSubmit}
        onConfirmExisting={handleConfirmExisting}
      />

      <ReportDialog
        open={Boolean(editingReport)}
        onOpenChange={(o) => {
          if (!o) setEditingReport(null)
        }}
        coords={null}
        onSubmit={handleSubmit}
        editingReport={editingReport}
        onUpdate={async (patch) => {
          if (!editingReport) return
          await handleUpdate(editingReport.id, patch)
          setDetailReport((prev) => (prev && prev.id === editingReport.id ? { ...prev, ...patch } : prev))
        }}
      />

      <ReportDetailDialog
        report={detailReport}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(report) => {
          setDetailOpen(false)
          setEditingReport(report)
        }}
        onDeleted={handleDeleted}
        onResolved={handleResolved}
      />
    </div>
  )
}
