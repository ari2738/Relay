"use client"

import dynamic from "next/dynamic"
import type { HeatmapPoint } from "@/app/actions/admin"

const HeatmapView = dynamic(() => import("@/components/relay/admin/heatmap-view"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading map…</div>,
})

export function HeatmapPageClient({ points }: { points: HeatmapPoint[] }) {
  return <HeatmapView points={points} />
}
