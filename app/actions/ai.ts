"use server"

import { db } from "@/lib/db"
import { reports } from "@/lib/db/schema"
import { aiAvailable, callClaudeForJson, fetchImageAsBase64 } from "@/lib/ai"
import { severityMeta, type CategoryId, type SeverityId, type StatusId } from "@/lib/relay"
import { eq } from "drizzle-orm"

export interface ScoreResult {
  score: number
  reasoning: string
  source: "ai" | "rule-based"
}

function ruleBasedScore(status: StatusId, severity: SeverityId): ScoreResult {
  const statusBase: Record<StatusId, number> = { accessible: 85, limited: 55, blocked: 20 }
  const severityPenalty: Record<SeverityId, number> = { low: 0, medium: 5, high: 15, critical: 25 }
  const score = Math.max(0, Math.min(100, statusBase[status] - severityPenalty[severity]))
  return {
    score,
    reasoning: `Estimated from status (${status}) and severity (${severity}) — no AI scoring configured.`,
    source: "rule-based",
  }
}

export async function suggestAccessibilityScore(input: {
  category: CategoryId
  status: StatusId
  severity: SeverityId
  title: string
  description?: string
}): Promise<ScoreResult> {
  if (!aiAvailable()) return ruleBasedScore(input.status, input.severity)

  const result = await callClaudeForJson<{ score: number; reasoning: string }>({
    system:
      'You score how accessible a physical location feature is for wheelchair/mobility-device users, on a 0-100 scale (0 = completely inaccessible, 100 = fully accessible with no issues). Base it only on the report details given. Return JSON: {"score": number, "reasoning": string (one short sentence)}.',
    content: [
      {
        type: "text",
        text: `Category: ${input.category}\nStatus: ${input.status}\nSeverity: ${severityMeta(input.severity).label}\nTitle: ${input.title}\nDescription: ${input.description || "(none)"}`,
      },
    ],
    maxTokens: 200,
  })

  if (!result || typeof result.score !== "number") return ruleBasedScore(input.status, input.severity)
  return { score: Math.max(0, Math.min(100, Math.round(result.score))), reasoning: result.reasoning, source: "ai" }
}

export interface SpamCheckResult {
  flagged: boolean
  reason: string | null
}

const SPAM_PATTERNS = [/https?:\/\//i, /\b(viagra|crypto|casino|forex|loan approved)\b/i, /(.)\1{6,}/]

function ruleBasedSpamCheck(title: string, description: string): SpamCheckResult {
  const text = `${title} ${description}`
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) return { flagged: true, reason: "Matched a spam pattern (link or keyword)" }
  }
  return { flagged: false, reason: null }
}

export async function checkReportForSpam(input: { title: string; description?: string }): Promise<SpamCheckResult> {
  const description = input.description ?? ""
  if (!aiAvailable()) return ruleBasedSpamCheck(input.title, description)

  const result = await callClaudeForJson<{ flagged: boolean; reason: string | null }>({
    system:
      'You moderate a community accessibility-reporting app. Flag content that is spam, an advertisement, abusive, or has nothing to do with physical accessibility (entrances, elevators, restrooms, curb cuts, temporary blockers). Genuine accessibility reports — even terse or informal ones — should NOT be flagged. Return JSON: {"flagged": boolean, "reason": string | null}.',
    content: [{ type: "text", text: `Title: ${input.title}\nDescription: ${description || "(none)"}` }],
    maxTokens: 150,
  })

  if (!result) return ruleBasedSpamCheck(input.title, description)
  return { flagged: Boolean(result.flagged), reason: result.reason ?? null }
}

export interface ImageCheckResult {
  relevant: boolean
  reason: string | null
}

/** Best-effort — if AI isn't configured or the fetch/call fails, images are
 *  treated as relevant (fail open) rather than blocking legitimate reports. */
export async function validateReportImage(imageUrl: string, category: CategoryId): Promise<ImageCheckResult> {
  if (!aiAvailable()) return { relevant: true, reason: null }

  const source = await fetchImageAsBase64(imageUrl)
  if (!source) return { relevant: true, reason: null }

  const result = await callClaudeForJson<{ relevant: boolean; reason: string | null }>({
    system:
      'You check whether a photo plausibly shows what it claims: a physical-accessibility feature (entrance, elevator, restroom, curb cut, or temporary blocker/obstruction). Reject only clearly unrelated or inappropriate images (memes, selfies unrelated to the location, explicit content, ads) — be lenient with ordinary photos of doors, ramps, sidewalks, buildings, or signage. Return JSON: {"relevant": boolean, "reason": string | null}.',
    content: [
      { type: "text", text: `Reported category: ${category}` },
      { type: "image", source },
    ],
    maxTokens: 150,
  })

  if (!result) return { relevant: true, reason: null }
  return { relevant: Boolean(result.relevant), reason: result.reason ?? null }
}

/** Runs all three checks for a freshly created report and writes the
 *  results back onto it. Best-effort — wrapped in try/catch at the call
 *  site in reports.ts so a slow/failed AI call never blocks report creation. */
export async function runAiChecksForReport(
  reportId: number,
  opts: {
    category: CategoryId
    status: StatusId
    severity: SeverityId
    title: string
    description?: string
    imageUrls: string[]
  },
): Promise<void> {
  if (!aiAvailable()) return

  const [score, spam, image] = await Promise.all([
    suggestAccessibilityScore(opts),
    checkReportForSpam(opts),
    opts.imageUrls[0] ? validateReportImage(opts.imageUrls[0], opts.category) : Promise.resolve(null),
  ])

  const flagged = spam.flagged || (image ? !image.relevant : false)
  const flagReason = spam.flagged ? spam.reason : image && !image.relevant ? image.reason : null

  await db
    .update(reports)
    .set({
      aiSuggestedScore: score.score,
      aiScoreReasoning: score.reasoning,
      aiFlagged: flagged,
      aiFlagReason: flagReason,
    })
    .where(eq(reports.id, reportId))
}
