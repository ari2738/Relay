"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, ShieldCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useSession, signOut } from "@/lib/auth-client"
import { ROLE_META, isRole, type Role } from "@/lib/roles"

export function AuthWidget() {
  const { data, isPending } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" aria-hidden="true" />
  }

  if (!data?.user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Sign in
        </Link>
        <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
          Sign up
        </Link>
      </div>
    )
  }

  const rawRole = (data.user as { role?: string }).role ?? ""
  const role: Role = isRole(rawRole) ? rawRole : "accessibility_user"

  async function handleSignOut() {
    await signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2.5 hover:bg-muted"
        aria-expanded={open}
      >
        <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {data.user.name?.charAt(0).toUpperCase() ?? "?"}
        </span>
        <span className="hidden text-sm font-medium sm:inline">{data.user.name}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[800]" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-[900] mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{data.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{data.user.email}</p>
              <Badge variant="secondary" className="mt-1.5 gap-1">
                <ShieldCheck className="size-3" aria-hidden="true" />
                {ROLE_META[role].label}
              </Badge>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
            >
              Dashboard
            </Link>
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
            >
              Settings
            </Link>
            {role === "volunteer" && (
              <Link
                href="/volunteer"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
              >
                Volunteer tools
              </Link>
            )}
            {role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
              >
                Admin dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
