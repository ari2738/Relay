"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Pencil, ShieldCheck, ThumbsUp, Bookmark, Sparkles, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Report, ReportComment } from "@/lib/db/schema"
import { categoryMeta, severityMeta, type CategoryId } from "@/lib/relay"
import { StatusBadge } from "./status-badge"
import { useSession } from "@/lib/auth-client"
import {
  addComment,
  deleteComment as deleteCommentAction,
  getComments,
  toggleLike,
  confirmReport,
  resolveReport,
} from "@/app/actions/community"
import { deleteReport as deleteReportAction } from "@/app/actions/reports"
import { isSaved, recordVisit, toggleSavedPlace } from "@/app/actions/saved-places"

interface ReportDetailDialogProps {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (report: Report) => void
  onDeleted: (id: number) => void
  onResolved: (id: number) => void
}

export function ReportDetailDialog({
  report,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
  onResolved,
}: ReportDetailDialogProps) {
  const { data: session } = useSession()
  const user = session?.user as { id: string; name: string; role?: string } | undefined
  const role = user?.role ?? null

  const [comments, setComments] = useState<ReportComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentBody, setCommentBody] = useState("")
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !report) return
    setLikeCount(0)
    setLiked(false)
    setSaved(false)
    setLoadingComments(true)
    getComments(report.id)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false))

    isSaved(report.id)
      .then(setSaved)
      .catch(() => {})
    recordVisit(report.id).catch(() => {})
  }, [open, report])

  if (!report) return null

  const cat = categoryMeta(report.category)
  const sev = severityMeta(report.severity)
  const isOwner = user?.id === report.userId
  const isVolunteer = role === "volunteer" || role === "admin"
  const canModerate = isOwner || role === "admin"

  async function handleLike() {
    if (!user) {
      toast.error("Sign in to like a report")
      return
    }
    startTransition(async () => {
      try {
        const result = await toggleLike(report!.id)
        setLiked(result.liked)
        setLikeCount(result.count)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save your like")
      }
    })
  }

  async function handleSave() {
    if (!user) {
      toast.error("Sign in to save places")
      return
    }
    startTransition(async () => {
      try {
        const result = await toggleSavedPlace(report!.id)
        setSaved(result.saved)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save")
      }
    })
  }

  async function handleConfirm() {
    startTransition(async () => {
      try {
        await confirmReport(report!.id)
        toast.success("Confirmed — thanks for verifying")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not confirm")
      }
    })
  }

  async function handleResolve() {
    startTransition(async () => {
      try {
        await resolveReport(report!.id)
        toast.success("Marked as resolved")
        onResolved(report!.id)
        onOpenChange(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not resolve")
      }
    })
  }

  async function handleDelete() {
    if (!confirm("Remove this report? This can't be undone.")) return
    startTransition(async () => {
      try {
        await deleteReportAction(report!.id)
        toast.success("Report removed")
        onDeleted(report!.id)
        onOpenChange(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not delete")
      }
    })
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    const body = commentBody.trim()
    if (!body) return
    if (!user) {
      toast.error("Sign in to comment")
      return
    }
    try {
      const created = await addComment(report!.id, body)
      setComments((prev) => [created, ...prev])
      setCommentBody("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post comment")
    }
  }

  async function handleDeleteComment(id: number) {
    try {
      await deleteCommentAction(id)
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete comment")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {report.title}
            {report.resolvedAt && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3" aria-hidden="true" />
                Resolved
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status as never} />
            <Badge variant="outline">{cat.label}</Badge>
            <Badge
              variant="outline"
              className={cn(
                report.severity === "critical" && "border-destructive/50 text-destructive",
                report.severity === "high" && "border-limited/50 text-limited-foreground",
              )}
            >
              {sev.label} severity
            </Badge>
            {report.aiSuggestedScore != null && (
              <Badge variant="outline" title={report.aiScoreReasoning ?? undefined} className="gap-1">
                <Sparkles className="size-3" aria-hidden="true" />
                AI score {report.aiSuggestedScore}/100
              </Badge>
            )}
          </div>

          {report.description && <p className="text-sm text-muted-foreground">{report.description}</p>}
          {report.address && <p className="text-sm text-muted-foreground">{report.address}</p>}

          {report.imageUrls && report.imageUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {report.imageUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-32 w-32 shrink-0 rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={liked ? "default" : "outline"}
              className="gap-1.5"
              disabled={isPending}
              onClick={handleLike}
            >
              <ThumbsUp className="size-3.5" aria-hidden="true" />
              {liked ? "Liked" : "Like"}
              {likeCount > 0 && <span>({likeCount})</span>}
            </Button>

            <Button
              type="button"
              size="sm"
              variant={saved ? "default" : "outline"}
              className="gap-1.5"
              disabled={isPending}
              onClick={handleSave}
            >
              <Bookmark className="size-3.5" aria-hidden="true" />
              {saved ? "Saved" : "Save"}
            </Button>

            {isVolunteer && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isPending}
                onClick={handleConfirm}
              >
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Confirm ({report.confirmedCount})
              </Button>
            )}

            {isVolunteer && !report.resolvedAt && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isPending}
                onClick={handleResolve}
              >
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Mark resolved
              </Button>
            )}

            {canModerate && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => onEdit(report!)}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                Edit
              </Button>
            )}

            {canModerate && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="gap-1.5"
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete
              </Button>
            )}
          </div>

          <div className="border-t border-border pt-3">
            <h3 className="mb-2 text-sm font-semibold">Comments</h3>

            {user ? (
              <form onSubmit={handleAddComment} className="mb-3 flex flex-col gap-2">
                <Textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                  maxLength={1000}
                />
                <Button type="submit" size="sm" className="self-end" disabled={!commentBody.trim()}>
                  Post
                </Button>
              </form>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground">Sign in to leave a comment.</p>
            )}

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {comments.map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{c.authorName}</p>
                      {(user?.id === c.userId || role === "admin") && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    <p className="text-muted-foreground">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
