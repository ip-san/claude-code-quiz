/**
 * Shared constants for quiz scripts.
 * Used by verify-state.mjs and fetch-docs.mjs.
 */

export const CATEGORY_DOC_MAP = {
  memory: ['memory', 'best-practices', 'settings'],
  skills: ['skills', 'sub-agents', 'best-practices'],
  tools: ['how-claude-code-works', 'interactive-mode', 'sub-agents'],
  commands: ['interactive-mode', 'cli-reference', 'common-workflows'],
  extensions: ['mcp', 'hooks', 'discover-plugins', 'settings'],
  session: ['how-claude-code-works', 'common-workflows', 'checkpointing', 'settings'],
  keyboard: ['interactive-mode', 'common-workflows'],
  bestpractices: ['best-practices', 'model-config', 'common-workflows', 'sandboxing'],
}

export const SUPPLEMENTARY_DOCS = ['settings', 'permissions', 'overview', 'agent-sdk-overview']
