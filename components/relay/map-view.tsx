"use client"

import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useMemo } from "react"

import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet"

import type { Report } from "@/lib/db/schema"

import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  type CategoryId,
  type StatusId,
} from "@/lib/relay"

import { markerHtml } from "./marker-svg"
import PlaceSearch from "./place-search"
import CurrentLocation from "./current-location"

interface MapViewProps {
  reports: Report[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  placing: boolean
  pending: [number, number] | null
  onMapClick: (lat: number, lng: number) => void
  dark: boolean
}

/* -------------------------------------------------------
   Map click handler
------------------------------------------------------- */

function ClickHandler({
  onMapClick,
  placing,
}: {
  onMapClick: (lat: number, lng: number) => void
  placing: boolean
}) {
  useMapEvents({
    click(event) {
      if (!placing) return

      onMapClick(
        event.latlng.lat,
        event.latlng.lng
      )
    },
  })

  return null
}

/* -------------------------------------------------------
   Move map to selected report
------------------------------------------------------- */

function FlyToSelected({
  report,
}: {
  report: Report | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!report) return

    map.flyTo(
      [report.lat, report.lng],
      Math.max(map.getZoom(), 16),
      {
        duration: 0.6,
      }
    )
  }, [report, map])

  return null
}

/* -------------------------------------------------------
   Pending report marker
------------------------------------------------------- */

const pendingIcon = L.divIcon({
  className: "relay-pending-marker",

  html: `
    <div
      style="
        width:26px;
        height:26px;
        border-radius:9999px;
        background:var(--primary);
        box-shadow:
          0 0 0 6px
          color-mix(
            in oklab,
            var(--primary) 30%,
            transparent
          );
        animation:relay-pulse 1.4s ease-in-out infinite;
      "
    ></div>

    <style>
      @keyframes relay-pulse {
        0%, 100% {
          box-shadow:
            0 0 0 5px
            color-mix(
              in oklab,
              var(--primary) 35%,
              transparent
            );
        }

        50% {
          box-shadow:
            0 0 0 12px
            color-mix(
              in oklab,
              var(--primary) 8%,
              transparent
            );
        }
      }
    </style>
  `,

  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

/* -------------------------------------------------------
   Main Map
------------------------------------------------------- */

export default function MapView({
  reports,
  selectedId,
  onSelect,
  placing,
  pending,
  onMapClick,
  dark,
}: MapViewProps) {
  const selected = useMemo(
    () =>
      reports.find(
        (report) =>
          report.id === selectedId
      ) ?? null,
    [reports, selectedId]
  )

  /*
   * OpenStreetMap tiles.
   *
   * No API key required.
   */
  const tileUrl =
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      style={{
        cursor: placing
          ? "crosshair"
          : "grab",
      }}
      zoomControl={false}
      scrollWheelZoom={true}
      attributionControl={true}
    >
      {/* ------------------------------------------------
          OpenStreetMap
      ------------------------------------------------ */}

      <TileLayer
        url={tileUrl}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      />

      {/* ------------------------------------------------
          Place search
      ------------------------------------------------ */}

      <PlaceSearch />

      {/* ------------------------------------------------
          Click on map
      ------------------------------------------------ */}
      <CurrentLocation />

      {/* ------------------------------------------------
          Current Location
      ------------------------------------------------ */}  

      <ClickHandler
        onMapClick={onMapClick}
        placing={placing}
      />

      {/* ------------------------------------------------
          Selected report
      ------------------------------------------------ */}

      <FlyToSelected
        report={selected}
      />

      {/* ------------------------------------------------
          Report markers
      ------------------------------------------------ */}

      {reports.map((report) => {
        const isSelected =
          report.id === selectedId

        const size =
          isSelected ? 44 : 36

        const icon = L.divIcon({
          className: "relay-marker",

          html: markerHtml(
            report.category as CategoryId,
            report.status as StatusId,
            isSelected
          ),

          iconSize: [
            size,
            size + 9,
          ],

          iconAnchor: [
            size / 2,
            size + 9,
          ],
        })

        return (
          <Marker
            key={report.id}
            position={[
              report.lat,
              report.lng,
            ]}
            icon={icon}
            zIndexOffset={
              isSelected
                ? 1000
                : 0
            }
            eventHandlers={{
              click: () => {
                onSelect(report.id)
              },
            }}
          />
        )
      })}

      {/* ------------------------------------------------
          Pending report location
      ------------------------------------------------ */}

      {pending && (
        <Marker
          position={pending}
          icon={pendingIcon}
          interactive={false}
        />
      )}
    </MapContainer>
  )
}