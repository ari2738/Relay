"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ROLE_META, ROLES, type Role } from "@/lib/roles"
import { getAllUsers, updateUserRole, type AdminUserRow } from "@/app/actions/admin"

export function UserTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleSearch(value: string) {
    setQuery(value)
    startTransition(async () => {
      const results = await getAllUsers(value || undefined)
      setUsers(results)
    })
  }

  async function handleRoleChange(userId: string, role: Role) {
    const prev = users
    setUsers((cur) => cur.map((u) => (u.id === userId ? { ...u, role } : u))) // optimistic
    try {
      await updateUserRole(userId, role)
    } catch (err) {
      setUsers(prev)
      toast.error(err instanceof Error ? err.message : "Could not update role")
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search name or email…"
          className="pl-8"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium">{u.name}</td>
                <td className="max-w-40 truncate px-3 py-2 text-muted-foreground">{u.email}</td>
                <td className="px-3 py-2">
                  <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, (v ?? u.role) as Role)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_META[r].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{u.points}</td>
              </tr>
            ))}
            {users.length === 0 && !isPending && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
