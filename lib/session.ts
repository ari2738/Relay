import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { type Role, isRole } from "@/lib/roles"

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null
  const role = isRole(session.user.role as string) ? (session.user.role as Role) : "accessibility_user"
  return { ...session.user, role }
}

/** Use in a server component/page. Redirects to /sign-in if unauthenticated,
 *  or to /dashboard if the role doesn't match (instead of a raw 403). */
export async function requireRole(...allowed: Role[]) {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")
  if (allowed.length > 0 && !allowed.includes(user.role)) redirect("/dashboard")
  return user
}
