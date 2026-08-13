import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireRole } from "@/lib/session"
import { getHeatmapPoints } from "@/app/actions/admin"
import { HeatmapPageClient } from "./heatmap-client"

export const dynamic = "force-dynamic"

export default async function AdminHeatmapPage() {
  await requireRole("admin")
  const points = await getHeatmapPoints()

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to admin
        </Link>
        <h1 className="text-sm font-semibold">Accessibility heatmap</h1>
        <span className="text-xs text-muted-foreground">{points.length} active reports</span>
      </div>
      <div className="flex-1">
        <HeatmapPageClient points={points} />
      </div>
    </div>
  )
}
