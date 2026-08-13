"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Bookmark, Clock } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORIES, STATUSES, categoryMeta } from "@/lib/relay"
import { StatusBadge } from "./status-badge"
import { applyTheme, type ThemeSetting } from "@/lib/theme-client"
import { applyAccessibilityFlags } from "@/lib/theme-client"
import { updateMyPreferences } from "@/app/actions/preferences"
import type { UserPreferences } from "@/lib/db/schema"
import type { SavedPlaceItem, VisitedPlaceItem } from "@/app/actions/saved-places"

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "hi", label: "हिन्दी" },
]

interface AccountSettingsProps {
  initialPrefs: UserPreferences
  initialSaved: SavedPlaceItem[]
  initialVisited: VisitedPlaceItem[]
}

export function AccountSettings({ initialPrefs, initialSaved, initialVisited }: AccountSettingsProps) {
  const [prefs, setPrefs] = useState(initialPrefs)
  const [saving, setSaving] = useState(false)

  async function save(patch: Partial<UserPreferences>) {
    const next = { ...prefs, ...patch }
    setPrefs(next) // optimistic
    setSaving(true)
    try {
      await updateMyPreferences(patch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings")
      setPrefs(prefs) // revert
    } finally {
      setSaving(false)
    }
  }

  function handleTheme(value: ThemeSetting) {
    applyTheme(value)
    save({ theme: value })
  }

  function handleAccessibilityFlag(key: "highContrast" | "reduceMotion", value: boolean) {
    applyAccessibilityFlags({ [key]: value })
    save({ [key]: value })
  }

  const defaultCategories = new Set(prefs.defaultCategories ?? CATEGORIES.map((c) => c.id))
  const defaultStatuses = new Set(prefs.defaultStatuses ?? STATUSES.map((s) => s.id))

  function toggleDefaultCategory(id: string) {
    const next = new Set(defaultCategories)
    next.has(id) ? next.delete(id) : next.add(id)
    save({ defaultCategories: Array.from(next) })
  }

  function toggleDefaultStatus(id: string) {
    const next = new Set(defaultStatuses)
    next.has(id) ? next.delete(id) : next.add(id)
    save({ defaultStatuses: Array.from(next) })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Appearance */}
      <Section title="Appearance">
        <Row label="Theme" description="Light, dark, or match your device.">
          <Select value={prefs.theme} onValueChange={(v) => handleTheme((v ?? "system") as ThemeSetting)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Language" description="Interface language.">
          <Select value={prefs.language} onValueChange={(v) => save({ language: v ?? "en" })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Section>

      {/* Accessibility */}
      <Section title="Accessibility">
        <Row label="High contrast" description="Stronger borders and text contrast.">
          <Switch
            checked={prefs.highContrast}
            onCheckedChange={(v) => handleAccessibilityFlag("highContrast", v)}
          />
        </Row>
        <Row label="Reduce motion" description="Minimize animations and transitions.">
          <Switch
            checked={prefs.reduceMotion}
            onCheckedChange={(v) => handleAccessibilityFlag("reduceMotion", v)}
          />
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Nearby accessibility issues" description="New reports near places you've saved.">
          <Switch
            checked={prefs.notifyNearbyIssues}
            onCheckedChange={(v) => save({ notifyNearbyIssues: v })}
          />
        </Row>
        <Row label="Report resolved" description="When something you reported gets fixed.">
          <Switch
            checked={prefs.notifyReportResolved}
            onCheckedChange={(v) => save({ notifyReportResolved: v })}
          />
        </Row>
        <Row label="Volunteer confirmed your report" description="When a volunteer verifies your report.">
          <Switch
            checked={prefs.notifyVolunteerConfirmed}
            onCheckedChange={(v) => save({ notifyVolunteerConfirmed: v })}
          />
        </Row>
        <Row label="New accessible place nearby" description="New confirmed spots near places you've saved.">
          <Switch
            checked={prefs.notifyNewAccessiblePlace}
            onCheckedChange={(v) => save({ notifyNewAccessiblePlace: v })}
          />
        </Row>
      </Section>

      {/* Default map filters */}
      <Section title="Default map filters" description="What's shown when you open the map.">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              active={defaultCategories.has(c.id)}
              onClick={() => toggleDefaultCategory(c.id)}
              label={c.short}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Chip
              key={s.id}
              active={defaultStatuses.has(s.id)}
              onClick={() => toggleDefaultStatus(s.id)}
              label={s.label}
            />
          ))}
        </div>
      </Section>

      {/* Saved places */}
      <Section title="Saved places">
        {initialSaved.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing saved yet — bookmark a spot from its details.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {initialSaved.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Bookmark className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {categoryMeta(s.category).label}
                      {s.address ? ` · ${s.address}` : ""}
                    </p>
                  </div>
                </div>
                <StatusBadge status={s.status as never} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Visited places */}
      <Section title="Recently visited">
        {initialVisited.length === 0 ? (
          <p className="text-sm text-muted-foreground">Places you view will show up here.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {initialVisited.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="truncate font-medium">{v.title}</p>
                </div>
                <StatusBadge status={v.status as never} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {saving ? "Saving…" : "Changes save automatically."}
      </p>
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        Back to map
      </Link>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </div>
  )
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  )
}
