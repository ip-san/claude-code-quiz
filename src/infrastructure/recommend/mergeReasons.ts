/**
 * Build final recommendation result by merging AI-selected reasons with metadata.
 *
 * Architecture:
 *   reasons.json (AI output) = source of truth for IDs, reasons, coachingMessage
 *   latest-recommend.json (script output) = source of truth for metadata (topics, sessionCount, promptSamples)
 *   stdout = fallback for reasons when reasons.json is missing
 *
 * The merged result uses AI-selected IDs (not the random IDs from collect-session.mjs).
 * Pure function (no file I/O) for testability.
 */

import { z } from 'zod'
import { extractReasonsFromStdout } from './extractReasons'

/** Zod schema for reasons.json — validates structure before merging */
const ReasonsFileSchema = z.object({
  reasons: z
    .record(z.string().regex(/^[a-z]+-\d+$/), z.string().min(1))
    .refine((r) => Object.keys(r).length > 0, { message: 'reasons must not be empty' }),
  coachingMessage: z.string().optional(),
})

export type ReasonsFile = z.infer<typeof ReasonsFileSchema>

export interface RecommendResult {
  ids: string[]
  reasons?: Record<string, string>
  coachingMessage?: string
  questionCount: number
  url: string
  [key: string]: unknown
}

export interface MergeResult {
  merged: boolean
  source: 'reasons.json' | 'stdout' | null
  result: RecommendResult
}

/**
 * Build final recommendation by applying AI reasons to metadata.
 *
 * @param metadata - Metadata from latest-recommend.json (topics, sessionCount, promptSamples)
 * @param reasonsJson - Raw content of reasons.json (null if file doesn't exist)
 * @param stdout - Skill's stdout output for fallback extraction
 */
export function mergeReasons(metadata: RecommendResult, reasonsJson: string | null, stdout: string): MergeResult {
  // Skip if metadata already has reasons (previous merge succeeded)
  if (metadata.reasons && Object.keys(metadata.reasons).length > 0) {
    return { merged: false, source: null, result: metadata }
  }

  // Strategy 1: reasons.json is the primary source of truth (Zod-validated)
  if (reasonsJson) {
    try {
      const parsed = ReasonsFileSchema.safeParse(JSON.parse(reasonsJson))
      if (parsed.success) {
        const ai = parsed.data
        const ids = Object.keys(ai.reasons)
        return {
          merged: true,
          source: 'reasons.json',
          result: {
            ...metadata,
            ids,
            reasons: ai.reasons,
            questionCount: ids.length,
            url: 'https://ip-san.github.io/claude-code-quiz/?ids=' + ids.join(','),
            coachingMessage: ai.coachingMessage ?? metadata.coachingMessage,
          },
        }
      }
    } catch {
      // Invalid JSON — fall through to stdout
    }
  }

  // Strategy 2: Extract from stdout (fallback)
  const extracted = extractReasonsFromStdout(stdout)
  if (extracted) {
    return {
      merged: true,
      source: 'stdout',
      result: {
        ...metadata,
        ids: extracted.ids,
        reasons: extracted.reasons,
        questionCount: extracted.ids.length,
        url: 'https://ip-san.github.io/claude-code-quiz/?ids=' + extracted.ids.join(','),
        coachingMessage: extracted.coachingMessage ?? metadata.coachingMessage,
      },
    }
  }

  return { merged: false, source: null, result: metadata }
}
