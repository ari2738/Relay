// Central definition of Relay's three account roles. Keep this the single
// source of truth — lib/auth.ts, middleware.ts, and any role-gated UI all
// import from here instead of hardcoding string literals.

export type Role = "accessibility_user" | "volunteer" | "admin"

export const ROLES: Role[] = ["accessibility_user", "volunteer", "admin"]

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  accessibility_user: {
    label: "Accessibility User",
    description: "Find and save accessible places, report issues you encounter.",
  },
  volunteer: {
    label: "Volunteer",
    description: "Confirm and resolve community reports, earn points and badges.",
  },
  admin: {
    label: "Admin",
    description: "Moderate reports, manage users, view analytics.",
  },
}

export function isRole(value: string): value is Role {
  return (ROLES as string[]).includes(value)
}

// Roles a person can self-select at sign-up. Admin is granted manually
// (e.g. directly in the database) — never exposed as a sign-up option.
export const SELF_SERVICE_ROLES: Role[] = ["accessibility_user", "volunteer"]
