"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          That's on us — try again, and if it keeps happening, refresh the page.
        </p>
      </div>
      <Button onClick={() => reset()} className="gap-1.5">
        <RotateCcw className="size-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  )
}
