"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORIES, SEVERITIES, STATUSES, type CategoryId, type SeverityId, type StatusId } from "@/lib/relay"
import { checkDuplicates, type CreateReportInput, type DuplicateCandidate } from "@/app/actions/reports"
import { ImageUploader } from "./image-uploader"
import type { Report } from "@/lib/db/schema"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coords: [number, number] | null
  onSubmit: (input: CreateReportInput) => Promise<void>
  /** When set, the dialog edits this report instead of creating a new one. */
  editingReport?: Report | null
  onUpdate?: (patch: {
    category: string
    status: string
    severity: string
    title: string
    description: string
    address: string
    imageUrls: string[]
  }) => Promise<void>
  /** Jump straight to confirming an existing spot instead of creating one. */
  onConfirmExisting?: (id: number) => void
}

const EXPIRY_OPTIONS = [
  { value: "0", label: "No end time" },
  { value: "6", label: "About 6 hours" },
  { value: "24", label: "About a day" },
  { value: "72", label: "A few days" },
  { value: "168", label: "About a week" },
]

export function ReportDialog({
  open,
  onOpenChange,
  coords,
  onSubmit,
  editingReport,
  onUpdate,
  onConfirmExisting,
}: ReportDialogProps) {
  const isEditing = Boolean(editingReport)

  const [category, setCategory] = useState<CategoryId>("entrance")
  const [status, setStatus] = useState<StatusId>("accessible")
  const [severity, setSeverity] = useState<SeverityId>("medium")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState("")
  const [reporter, setReporter] = useState("")
  const [expiry, setExpiry] = useState("0")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)

  // Reset the form each time the dialog opens — from either an edit or a
  // fresh pin — so stale values from the last open don't leak through.
  useEffect(() => {
    if (!open) return
    setDuplicates(null)
    setError(null)
    if (editingReport) {
      setCategory(editingReport.category as CategoryId)
      setStatus(editingReport.status as StatusId)
      setSeverity((editingReport.severity as SeverityId) ?? "medium")
      setTitle(editingReport.title)
      setDescription(editingReport.description ?? "")
      setAddress(editingReport.address ?? "")
      setImageUrls(editingReport.imageUrls ?? [])
      setReporter("")
      setExpiry("0")
    } else {
      setCategory("entrance")
      setStatus("accessible")
      setSeverity("medium")
      setTitle("")
      setDescription("")
      setAddress("")
      setReporter("")
      setExpiry("0")
      setImageUrls([])
    }
  }, [open, editingReport])

  async function handleCreate(force: boolean) {
    if (!coords) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        category,
        status,
        severity,
        title,
        description,
        address,
        reporterName: reporter,
        lat: coords[0],
        lng: coords[1],
        expiresInHours: category === "blocker" ? Number(expiry) : 0,
        imageUrls,
        force,
      })
      setDuplicates(null)
      onOpenChange(false)
    } catch (err) {
      const dupErr = err as Error & { duplicates?: DuplicateCandidate[] }
      if (dupErr.message === "DUPLICATE_CANDIDATES" && dupErr.duplicates) {
        setDuplicates(dupErr.duplicates)
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError("Please add a short title.")
      return
    }
    setError(null)

    if (isEditing && onUpdate) {
      setSubmitting(true)
      try {
        await onUpdate({ category, status, severity, title, description, address, imageUrls })
        onOpenChange(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.")
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!coords) return

    // Quick duplicate check before creating — the server re-checks this
    // itself, so this is purely a faster / friendlier round trip.
    setCheckingDuplicates(true)
    const found = await checkDuplicates(category, coords[0], coords[1])
    setCheckingDuplicates(false)
    if (found.length > 0) {
      setDuplicates(found)
      return
    }

    await handleCreate(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit report" : "Add an accessibility report"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details — other people see this change right away."
              : "Share what you found so others can plan a route they can trust."}
          </DialogDescription>
        </DialogHeader>

        {duplicates && duplicates.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-limited" aria-hidden="true" />
              <p>
                There{"'"}s already a nearby spot of this type. Confirm one below, or add yours anyway if it{"'"}s
                really different.
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {duplicates.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.distanceMeters}m away{d.address ? ` · ${d.address}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onConfirmExisting?.(d.id)
                      onOpenChange(false)
                    }}
                  >
                    This one
                  </Button>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" onClick={() => handleCreate(true)} disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Add mine anyway
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {coords && !isEditing && (
              <p className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                Pin dropped at {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category">Type</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as CategoryId)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.short}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusId)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as SeverityId)}>
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label} — {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Ramped side entrance"
                maxLength={120}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Details (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything useful — door width, where to find staff, condition…"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Place or address (optional)</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. City Library, 12 Center St"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Photos (optional)</Label>
              <ImageUploader imageUrls={imageUrls} onChange={setImageUrls} />
            </div>

            {category === "blocker" && !isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expiry">Expected to last</Label>
                <Select value={expiry} onValueChange={(v) => setExpiry(v ?? EXPIRY_OPTIONS[0].value)}>
                  <SelectTrigger id="expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!isEditing && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reporter">Your name (optional)</Label>
                <Input
                  id="reporter"
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  placeholder="Shown as the reporter"
                  maxLength={40}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || checkingDuplicates || (!isEditing && !coords)}>
                {(submitting || checkingDuplicates) && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isEditing ? "Save changes" : "Add report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
