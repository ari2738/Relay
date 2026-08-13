import "server-only"

const ANTHROPIC_VERSION = "2023-06-01"
// Haiku is fast/cheap and plenty for lightweight moderation + scoring.
// Overridable via env in case the model id changes after this was written.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001"
const TIMEOUT_MS = 8000

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

interface ContentBlock {
  type: "text" | "image"
  text?: string
  source?: { type: "base64"; media_type: string; data: string }
}

/** Calls Claude and asks for strict JSON back. Returns null on any error,
 *  timeout, or missing API key — every caller in app/actions/ai.ts has a
 *  rule-based fallback for exactly that case, so this never needs to throw. */
export async function callClaudeForJson<T>(opts: {
  system: string
  content: ContentBlock[]
  maxTokens?: number
}): Promise<T | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 300,
        system: `${opts.system}\n\nRespond with ONLY a single valid JSON object — no prose, no markdown fences.`,
        messages: [{ role: "user", content: opts.content }],
      }),
      signal: controller.signal,
    })

    if (!res.ok) return null
    const data = (await res.json()) as { content?: { type: string; text?: string }[] }
    const text = data.content?.find((b) => b.type === "text")?.text
    if (!text) return null

    // Strip accidental code fences even though the prompt asks Claude not to use them.
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim()
    return JSON.parse(cleaned) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Fetches an image and base64-encodes it for a vision request. Returns
 *  null on any failure (oversized, wrong type, network error) rather than
 *  throwing, since image validation is always best-effort. */
export async function fetchImageAsBase64(url: string): Promise<ContentBlock["source"] | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const contentType = res.headers.get("content-type") ?? "image/jpeg"
    if (!contentType.startsWith("image/")) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength > 5 * 1024 * 1024) return null // keep the request small
    return { type: "base64", media_type: contentType, data: Buffer.from(buf).toString("base64") }
  } catch {
    return null
  }
}
