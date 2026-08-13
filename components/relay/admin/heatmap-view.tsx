"use client"

import "leaflet/dist/leaflet.css"
import { useMemo } from "react"
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet"
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/lib/relay"
import { STATUS_CLASSES } from "../icons"
import type { HeatmapPoint } from "@/app/actions/admin"

// Groups points into ~500m grid cells so density reads as clusters of
// varying size/opacity rather than an overwhelming pile of pins.
const CELL_DEGREES = 0.005

interface Cell {
  lat: number
  lng: number
  count: number
  byStatus: Record<string, number>
}

function buildCells(points: HeatmapPoint[]): Cell[] {
  const cells = new Map<string, Cell>()
  for (const p of points) {
    const gridLat = Math.round(p.lat / CELL_DEGREES) * CELL_DEGREES
    const gridLng = Math.round(p.lng / CELL_DEGREES) * CELL_DEGREES
    const key = `${gridLat.toFixed(4)},${gridLng.toFixed(4)}`
    const existing = cells.get(key)
    if (existing) {
      existing.count += 1
      existing.byStatus[p.status] = (existing.byStatus[p.status] ?? 0) + 1
    } else {
      cells.set(key, { lat: gridLat, lng: gridLng, count: 1, byStatus: { [p.status]: 1 } })
    }
  }
  return Array.from(cells.values())
}

function dominantStatus(cell: Cell): string {
  return Object.entries(cell.byStatus).sort((a, b) => b[1] - a[1])[0][0]
}

export default function HeatmapView({ points }: { points: HeatmapPoint[] }) {
  const cells = useMemo(() => buildCells(points), [points])
  const maxCount = useMemo(() => Math.max(1, ...cells.map((c) => c.count)), [cells])

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" zoomControl>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
      />
      {cells.map((cell, i) => {
        const status = dominantStatus(cell)
        const color = STATUS_CLASSES[status as keyof typeof STATUS_CLASSES]?.hex ?? "var(--primary)"
        const intensity = cell.count / maxCount
        return (
          <CircleMarker
            key={i}
            center={[cell.lat, cell.lng]}
            radius={10 + intensity * 26}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.25 + intensity * 0.45,
              weight: 1,
            }}
          >
            <Tooltip direction="top">
              {cell.count} report{cell.count === 1 ? "" : "s"}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
