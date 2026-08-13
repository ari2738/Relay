"use server"

import crypto from "node:crypto"
import { getCurrentUser } from "@/lib/session"

export interface CloudinarySignPayload {
  cloudName: string
  apiKey: string
  timestamp: number
  signature: string
  folder: string
}

/** Returns null when Cloudinary isn't configured — callers should disable
 *  the uploader rather than throw, since image upload is optional. */
export async function getCloudinaryUploadSignature(): Promise<CloudinarySignPayload | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return null

  // Uploads still require a session — keeps anonymous scripts from using
  // this endpoint as a free image host.
  const user = await getCurrentUser()
  if (!user) throw new Error("Sign in to upload photos")

  const timestamp = Math.round(Date.now() / 1000)
  const folder = "relay-reports"
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex")

  return { cloudName, apiKey, timestamp, signature, folder }
}
