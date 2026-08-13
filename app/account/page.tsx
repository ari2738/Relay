import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireRole } from "@/lib/session"
import { getMyPreferences } from "@/app/actions/preferences"
import { getMySavedPlaces, getMyVisitedPlaces } from "@/app/actions/saved-places"
import { AccountSettings } from "@/components/relay/account-settings"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const me = await requireRole()
  const [prefs, saved, visited] = await Promise.all([
    getMyPreferences(),
    getMySavedPlaces(),
    getMyVisitedPlaces(),
  ])

  if (!prefs) return null // requireRole() already redirects unauthenticated users

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">{me.name} · {me.email}</p>
      </div>

      <AccountSettings initialPrefs={prefs} initialSaved={saved} initialVisited={visited} />
    </div>
  )
}
