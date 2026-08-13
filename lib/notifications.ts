import { Bell, CheckCircle2, MapPin, ShieldCheck } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NotificationType =
  | "nearby_issue"
  | "report_resolved"
  | "volunteer_confirmed"
  | "new_accessible_place"

export const NOTIFICATION_META: Record<NotificationType, { label: string; icon: LucideIcon }> = {
  nearby_issue: { label: "Nearby accessibility issue", icon: Bell },
  report_resolved: { label: "Report resolved", icon: CheckCircle2 },
  volunteer_confirmed: { label: "Volunteer confirmed your report", icon: ShieldCheck },
  new_accessible_place: { label: "New accessible place nearby", icon: MapPin },
}

// How close a new report has to be to one of a user's saved places to
// trigger a "nearby" notification.
export const NEARBY_RADIUS_METERS = 750
