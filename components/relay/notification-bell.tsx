"use client"

import { useState } from "react"
import useSWR from "swr"
import { Bell } from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { NOTIFICATION_META, type NotificationType } from "@/lib/notifications"
import {
  getMyNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications"

function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000))
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  // Polls every 30s — good enough for a community app without adding a
  // websocket/push layer, and cheap since it's a single indexed count query.
  const { data: count = 0, mutate: mutateCount } = useSWR(
    session?.user ? "unread-count" : null,
    getUnreadCount,
    { refreshInterval: 30_000 },
  )
  const { data: items = [], mutate: mutateItems } = useSWR(
    open && session?.user ? "notifications" : null,
    () => getMyNotifications(20),
  )

  if (!session?.user) return null

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) mutateItems()
  }

  async function handleMarkRead(id: number) {
    await markNotificationRead(id)
    mutateItems((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)), { revalidate: false })
    mutateCount((c) => Math.max(0, (c ?? 1) - 1), { revalidate: false })
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    mutateItems((prev) => prev?.map((n) => ({ ...n, read: true })), { revalidate: false })
    mutateCount(0, { revalidate: false })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => handleOpenChange(!open)}
        className="relative grid size-8 place-items-center rounded-full border border-border bg-background hover:bg-muted"
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      >
        <Bell className="size-4" aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[800]" onClick={() => handleOpenChange(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-[900] mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-sm font-semibold">Notifications</p>
              {items.some((n) => !n.read) && (
                <button type="button" onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="my-1 h-px bg-border" />
            {items.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {items.map((n) => {
                  const meta = NOTIFICATION_META[n.type as NotificationType]
                  const Icon = meta?.icon ?? Bell
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted ${
                          n.read ? "opacity-60" : ""
                        }`}
                      >
                        <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{meta?.label ?? n.type}</span>
                          <span className="block truncate text-xs text-muted-foreground">{n.reportTitle}</span>
                          <span className="block text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                        </span>
                        {!n.read && (
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
