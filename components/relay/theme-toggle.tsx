"use client"

import { useEffect, useState } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { applyTheme, getStoredTheme, type ThemeSetting } from "@/lib/theme-client"
import { useSession } from "@/lib/auth-client"
import { updateMyPreferences } from "@/app/actions/preferences"

const OPTIONS: { value: ThemeSetting; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light theme" },
  { value: "system", icon: Monitor, label: "Match system theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
]

export function ThemeToggle() {
  const { data: session } = useSession()
  const [theme, setTheme] = useState<ThemeSetting>("system")

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  function choose(value: ThemeSetting) {
    setTheme(value)
    applyTheme(value)
    if (session?.user) {
      updateMyPreferences({ theme: value }).catch(() => {})
    }
  }

  return (
    <div className="flex items-center rounded-full border border-border bg-background p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = theme === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => choose(opt.value)}
            aria-label={opt.label}
            aria-pressed={active}
            className={cn(
              "grid size-6 place-items-center rounded-full transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
