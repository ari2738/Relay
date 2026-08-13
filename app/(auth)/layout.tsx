import Link from "next/link"
import { Route } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Route className="size-5" aria-hidden="true" />
        </div>
        <span className="text-lg font-bold tracking-tight">Relay</span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">{children}</div>
    </div>
  )
}
