"use client"

export type ThemeSetting = "light" | "dark" | "system"

const STORAGE_KEY = "relay-theme"

export function getStoredTheme(): ThemeSetting {
  if (typeof window === "undefined") return "system"
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === "light" || stored === "dark" ? stored : "system"
}

export function applyTheme(theme: ThemeSetting) {
  if (typeof window === "undefined") return
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme
  document.documentElement.classList.toggle("dark", resolved === "dark")
  document.documentElement.dataset.theme = theme
  window.localStorage.setItem(STORAGE_KEY, theme)
}

export function applyAccessibilityFlags(opts: { highContrast?: boolean; reduceMotion?: boolean }) {
  if (typeof window === "undefined") return
  if (opts.highContrast !== undefined) {
    document.documentElement.toggleAttribute("data-high-contrast", opts.highContrast)
  }
  if (opts.reduceMotion !== undefined) {
    document.documentElement.toggleAttribute("data-reduce-motion", opts.reduceMotion)
  }
}
