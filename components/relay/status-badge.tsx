import { cn } from "@/lib/utils"
import { statusMeta, type StatusId } from "@/lib/relay"
import { STATUS_CLASSES } from "./icons"

export function StatusBadge({ status, className }: { status: StatusId; className?: string }) {
  const meta = statusMeta(status)
  const c = STATUS_CLASSES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      {meta.label}
    </span>
  )
}
