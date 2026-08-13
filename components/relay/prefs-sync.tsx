"use client"

import { useEffect, useRef } from "react"
import { useSession } from "@/lib/auth-client"
import { applyAccessibilityFlags, applyTheme } from "@/lib/theme-client"
import { getMyPreferences } from "@/app/actions/preferences"
import type { UserPreferences } from "@/lib/db/schema"

interface PrefsSyncProps {
  onLoaded?: (prefs: UserPreferences) => void
}

export function PrefsSync({ onLoaded }: PrefsSyncProps = {}) {
  const { data: session } = useSession()
  const syncedFor = useRef<string | null>(null)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || syncedFor.current === userId) return
    syncedFor.current = userId

    getMyPreferences()
      .then((prefs) => {
        if (!prefs) return
        applyTheme(prefs.theme as "light" | "dark" | "system")
        applyAccessibilityFlags({ highContrast: prefs.highContrast, reduceMotion: prefs.reduceMotion })
        onLoaded?.(prefs)
      })
      .catch(() => {})
  }, [session?.user?.id, onLoaded])

  return null
}
