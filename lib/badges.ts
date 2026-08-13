export interface VolunteerStats {
  points: number
  confirmCount: number
  resolveCount: number
}

export interface Badge {
  id: string
  label: string
  description: string
  earned: boolean
}

const POINT_TIERS: { id: string; label: string; threshold: number }[] = [
  { id: "helper", label: "Helper", threshold: 25 },
  { id: "guide", label: "Guide", threshold: 100 },
  { id: "champion", label: "Champion", threshold: 300 },
  { id: "legend", label: "Legend", threshold: 750 },
]

export function computeBadges(stats: VolunteerStats): Badge[] {
  const badges: Badge[] = [
    {
      id: "first_confirm",
      label: "First Confirmation",
      description: "Confirmed your first report",
      earned: stats.confirmCount >= 1,
    },
    {
      id: "ten_confirms",
      label: "Verifier",
      description: "Confirmed 10 reports",
      earned: stats.confirmCount >= 10,
    },
    {
      id: "first_resolve",
      label: "Problem Solver",
      description: "Resolved your first report",
      earned: stats.resolveCount >= 1,
    },
    {
      id: "ten_resolves",
      label: "Fixer",
      description: "Resolved 10 reports",
      earned: stats.resolveCount >= 10,
    },
  ]

  for (const tier of POINT_TIERS) {
    badges.push({
      id: tier.id,
      label: tier.label,
      description: `Earned ${tier.threshold}+ points`,
      earned: stats.points >= tier.threshold,
    })
  }

  return badges
}

/** The next point tier not yet reached, for a "X points to go" nudge. */
export function nextPointTier(points: number): { label: string; threshold: number } | null {
  const next = POINT_TIERS.find((t) => points < t.threshold)
  return next ? { label: next.label, threshold: next.threshold } : null
}
