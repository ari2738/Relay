// Shared domain constants for Relay — the community accessibility map.

export type CategoryId = "entrance" | "elevator" | "restroom" | "curb_cut" | "blocker"

export type StatusId = "accessible" | "limited" | "blocked"

export type SeverityId = "low" | "medium" | "high" | "critical"

export interface SeverityMeta {
  id: SeverityId
  label: string
  description: string
}

export const SEVERITIES: SeverityMeta[] = [
  { id: "low", label: "Low", description: "Minor inconvenience" },
  { id: "medium", label: "Medium", description: "Noticeably harder to use" },
  { id: "high", label: "High", description: "Major barrier for most people" },
  { id: "critical", label: "Critical", description: "Completely unusable / unsafe" },
]

export function severityMeta(id: string): SeverityMeta {
  return SEVERITIES.find((s) => s.id === id) ?? SEVERITIES[1]
}

export function isSeverityId(value: string): value is SeverityId {
  return SEVERITIES.some((s) => s.id === value)
}

export interface CategoryMeta {
  id: CategoryId
  label: string
  short: string
  description: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "entrance",
    label: "Step-free entrance",
    short: "Entrance",
    description: "Ramped or level entry with no steps",
  },
  {
    id: "elevator",
    label: "Elevator / lift",
    short: "Elevator",
    description: "Working elevator or lift access",
  },
  {
    id: "restroom",
    label: "Accessible restroom",
    short: "Restroom",
    description: "Wheelchair-accessible restroom",
  },
  {
    id: "curb_cut",
    label: "Curb cut",
    short: "Curb cut",
    description: "Dropped curb for wheels and strollers",
  },
  {
    id: "blocker",
    label: "Temporary blocker",
    short: "Blocker",
    description: "Construction, broken lift, or obstruction",
  },
]

export interface StatusMeta {
  id: StatusId
  label: string
  description: string
}

export const STATUSES: StatusMeta[] = [
  { id: "accessible", label: "Accessible", description: "Confirmed usable" },
  { id: "limited", label: "Limited", description: "Usable with difficulty" },
  { id: "blocked", label: "Blocked", description: "Not currently usable" },
]

export function categoryMeta(id: string): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
}

export function statusMeta(id: string): StatusMeta {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0]
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value)
}

export function isStatusId(value: string): value is StatusId {
  return STATUSES.some((s) => s.id === value)
}

// Demo map center — a generic downtown grid so the seed data lands sensibly.
export const DEFAULT_CENTER: [number, number] = [40.7128, -74.006]
export const DEFAULT_ZOOM = 14
