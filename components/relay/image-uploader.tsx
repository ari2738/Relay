"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@supabase/supabase-js"

const MAX_IMAGES = 6

interface ImageUploaderProps {
  imageUrls: string[]
  onChange: (urls: string[]) => void
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function ImageUploader({
  imageUrls,
  onChange,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const remaining = MAX_IMAGES - imageUrls.length

    if (remaining <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} photos`)
      return
    }

    setUploading(true)

    try {
      const toUpload = Array.from(files).slice(0, remaining)
      const uploaded: string[] = []

      for (const file of toUpload) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`)
          continue
        }

        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} is over 8MB`)
          continue
        }

        const extension =
          file.name.split(".").pop()?.toLowerCase() || "jpg"

        const fileName = `${crypto.randomUUID()}.${extension}`
        const filePath = `reports/${fileName}`

        const { error } = await supabase.storage
          .from("relay-reports")
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (error) {
          console.error("Supabase upload error:", error)
          toast.error(`Couldn't upload ${file.name}: ${error.message}`)
          continue
        }

        const { data } = supabase.storage
          .from("relay-reports")
          .getPublicUrl(filePath)

        if (data.publicUrl) {
          uploaded.push(data.publicUrl)
        }
      }

      if (uploaded.length > 0) {
        onChange([...imageUrls, ...uploaded])
        toast.success(
          `${uploaded.length} photo${
            uploaded.length > 1 ? "s" : ""
          } uploaded`
        )
      }
    } catch (error) {
      console.error("Photo upload error:", error)
      toast.error("Photo upload failed")
    } finally {
      setUploading(false)

      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  function removeAt(index: number) {
    onChange(imageUrls.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {imageUrls.map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="group relative size-16 overflow-hidden rounded-lg border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Uploaded photo ${i + 1}`}
            className="h-full w-full object-cover"
          />

          <button
            type="button"
            onClick={() => removeAt(i)}
            className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove photo"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}

      {imageUrls.length < MAX_IMAGES && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex size-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
        >
          {uploading ? (
            <Loader2
              className="size-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <ImagePlus
              className="size-4"
              aria-hidden="true"
            />
          )}

          <span className="text-[10px] font-medium">
            {uploading ? "Uploading..." : "Add photo"}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}