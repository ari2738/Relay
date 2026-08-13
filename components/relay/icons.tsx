import { Accessibility, Construction, DoorOpen, MoveVertical, Toilet, type LucideIcon } from "lucide-react"
import type { CategoryId, StatusId } from "@/lib/relay"

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  entrance: DoorOpen,
  elevator: MoveVertical,
  restroom: Toilet,
  curb_cut: Accessibility,
  blocker: Construction,
}

// Tailwind classes per status, used for badges, dots, and marker fills.
export const STATUS_CLASSES: Record<StatusId, { bg: string; text: string; ring: string; hex: string }> = {
  accessible: {
    bg: "bg-accessible",
    text: "text-accessible-foreground",
    ring: "ring-accessible",
    hex: "var(--accessible)",
  },
  limited: {
    bg: "bg-limited",
    text: "text-limited-foreground",
    ring: "ring-limited",
    hex: "var(--limited)",
  },
  blocked: {
    bg: "bg-blocked",
    text: "text-blocked-foreground",
    ring: "ring-blocked",
    hex: "var(--blocked)",
  },
}
