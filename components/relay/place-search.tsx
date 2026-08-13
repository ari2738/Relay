"use client"

import { useEffect, useRef, useState } from "react"
import { useMap } from "react-leaflet"

interface SearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  type: string
  name?: string
}

export default function PlaceSearch() {
  const map = useMap()

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Search OpenStreetMap
  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    const controller = new AbortController()

    const timeout = setTimeout(async () => {
      try {
        setLoading(true)

        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?format=jsonv2` +
          `&q=${encodeURIComponent(trimmed)}` +
          `&limit=5` +
          `&addressdetails=1`

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Search failed")
        }

        const data = (await response.json()) as SearchResult[]

        setResults(data)
        setOpen(true)
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Place search error:", error)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, 500)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  function selectPlace(result: SearchResult) {
    const lat = Number(result.lat)
    const lng = Number(result.lon)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }

    // Move the Leaflet map to the selected location
    map.flyTo([lat, lng], 17, {
      duration: 1.2,
    })

    setQuery(result.name || result.display_name.split(",")[0])
    setOpen(false)
    setResults([])
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (results.length > 0) {
      selectPlace(results[0])
    }
  }

  return (
    <div
      ref={searchRef}
      className="absolute left-4 top-4 z-[1000] w-[min(420px,calc(100%-32px))]"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/95 p-2 shadow-xl backdrop-blur">
          {/* Search icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (results.length > 0) {
                setOpen(true)
              }
            }}
            placeholder="Search a place..."
            aria-label="Search for a place"
            className="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium outline-none placeholder:text-muted-foreground"
          />

          {loading && (
            <div
              className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary"
              aria-label="Searching"
            />
          )}

          {query && !loading && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setResults([])
                setOpen(false)
              }}
              className="mr-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </form>

      {/* Search results */}
      {open && results.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-xl backdrop-blur">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => selectPlace(result)}
              className="flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors last:border-b-0 hover:bg-muted"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {result.name || result.display_name.split(",")[0]}
                </p>

                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {result.display_name}
                </p>
              </div>
            </button>
          ))}

          <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            Search powered by OpenStreetMap contributors
          </div>
        </div>
      )}

      {open &&
        !loading &&
        query.trim().length >= 3 &&
        results.length === 0 && (
          <div className="mt-2 rounded-2xl border border-border bg-background/95 p-4 text-center text-sm text-muted-foreground shadow-xl backdrop-blur">
            No places found.
          </div>
        )}
    </div>
  )
}