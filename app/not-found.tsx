import Link from "next/link"
import { MapPin } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <MapPin className="size-6" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight">Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          That page doesn&apos;t exist, or you may have followed an old link.
        </p>
      </div>
      <Link href="/" className={cn(buttonVariants())}>
        Back to the map
      </Link>
    </div>
  )
}
