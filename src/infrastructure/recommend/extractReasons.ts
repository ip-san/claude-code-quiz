/**
 * Extract recommendation reasons and coaching message from skill stdout.
 *
 * The /recommend skill outputs AI-selected questions with reasons in markdown,
 * but its node -e script often omits the `reasons` field from the JSON file.
 * This module parses the markdown stdout to recover them.
 */

export interface ExtractedReasons {
  reasons: Record<string, string>
  ids: string[]
  coachingMessage?: string
}

/**
 * Parse skill stdout to extract per-question reasons.
 * Supports two markdown formats:
 *   Pattern 1: **bp-073** [advanced]: reason text
 *   Pattern 2: `bp-073`: reason text
 */
export function extractReasonsFromStdout(stdout: string): ExtractedReasons | null {
  const reasons: Record<string, string> = {}

  // Pattern 1: **ID** [difficulty]: reason
  const p1 = /\*\*([a-z]+-\d+)\*\*\s*\[(?:beginner|intermediate|advanced)\][：:]\s*(.+)/g
  // Pattern 2: `ID`: reason (backtick-wrapped)
  const p2 = /`([a-z]+-\d+)`[：:]\s*(.+)/g

  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop pattern
  for (let match = p1.exec(stdout); match !== null; match = p1.exec(stdout)) {
    reasons[match[1]] = match[2].trim()
  }
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop pattern
  for (let match = p2.exec(stdout); match !== null; match = p2.exec(stdout)) {
    if (!reasons[match[1]]) reasons[match[1]] = match[2].trim()
  }

  if (Object.keys(reasons).length === 0) return null

  // Extract coaching message
  const coachMatch = stdout.match(/コーチングメッセージ[：:]\s*(.+)/)
  const coachingMessage = coachMatch ? coachMatch[1].trim().replace(/^\*+\s*/, '') : undefined

  return {
    reasons,
    ids: Object.keys(reasons),
    coachingMessage,
  }
}
