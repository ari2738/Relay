"use client"

import { useState } from "react"
import { Circle, CircleMarker, useMap } from "react-leaflet"

export default function CurrentLocation() {
  const map = useMap()

  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState("")

  function findMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location.")
      return
    }

    setLoading(true)
    setError("")

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const accuracyMeters = position.coords.accuracy

        console.log("MY LOCATION:", latitude, longitude)
        console.log("LOCATION ACCURACY:", accuracyMeters, "meters")

        const currentLocation: [number, number] = [
          latitude,
          longitude,
        ]

        setLocation(currentLocation)
        setAccuracy(accuracyMeters)

        map.flyTo(currentLocation, 17, {
          duration: 1.2,
        })

        setLoading(false)
      },

      (error) => {
        console.error("Geolocation error:", error)

        if (error.code === 1) {
          setError("Location permission was denied.")
        } else if (error.code === 2) {
          setError("Your location could not be determined.")
        } else {
          setError("Location request timed out.")
        }

        setLoading(false)
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    )
  }

  return (
    <>
      {/* Current location marker */}
      {location && (
        <>
          <Circle
            center={location}
            radius={accuracy ?? 50}
            pathOptions={{
              fillOpacity: 0.12,
              weight: 1,
            }}
          />

          <CircleMarker
            center={location}
            radius={9}
            pathOptions={{
              fillOpacity: 1,
              weight: 3,
            }}
          />
        </>
      )}

      {/* Location button */}
      <button
        type="button"
        onClick={findMyLocation}
        disabled={loading}
        title="Use my current location"
        aria-label="Use my current location"
        className="absolute right-4 top-4 z-[2000] flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background shadow-lg"
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        ) : (
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="8" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
          </svg>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="absolute right-4 top-20 z-[2000] max-w-[260px] rounded-xl border border-border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
          {error}
        </div>
      )}
    </>
  )
}
