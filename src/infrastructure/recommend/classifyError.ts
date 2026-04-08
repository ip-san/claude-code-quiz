/**
 * Classify CLI error messages into user-friendly error types.
 *
 * Pure function for testability — no I/O, no Electron dependencies.
 */

export type RecommendErrorType = 'cli_not_found' | 'auth_required' | 'model_unavailable' | 'timeout' | 'unknown'

/**
 * Classify an error message from Claude CLI into a specific error type.
 * Used by both pre-flight check and post-execution error handling.
 */
export function classifyCliError(errorMessage: string): RecommendErrorType {
  const msg = errorMessage.toLowerCase()

  if (msg.includes('enoent') || msg.includes('not found') || msg.includes('command not found')) {
    return 'cli_not_found'
  }

  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'timeout'
  }

  if (
    msg.includes('auth') ||
    msg.includes('login') ||
    msg.includes('unauthorized') ||
    msg.includes('401') ||
    msg.includes('api key') ||
    msg.includes('not logged in')
  ) {
    return 'auth_required'
  }

  if (
    msg.includes('model') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('403') ||
    msg.includes('permission') ||
    msg.includes('billing') ||
    msg.includes('subscription')
  ) {
    return 'model_unavailable'
  }

  return 'unknown'
}
