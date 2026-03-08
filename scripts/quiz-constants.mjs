/**
 * Shared constants for quiz scripts.
 * Used by verify-state.mjs and fetch-docs.mjs.
 */

export const CATEGORY_DOC_MAP = {
  memory: ['memory', 'best-practices', 'settings', 'server-managed-settings'],
  skills: ['skills', 'sub-agents', 'best-practices', 'agent-teams'],
  tools: ['how-claude-code-works', 'interactive-mode', 'sub-agents', 'vs-code', 'jetbrains'],
  commands: ['interactive-mode', 'cli-reference', 'common-workflows', 'headless', 'github-actions', 'gitlab-ci-cd', 'scheduled-tasks'],
  extensions: ['mcp', 'hooks', 'hooks-guide', 'discover-plugins', 'plugins', 'plugins-reference', 'plugin-marketplaces', 'settings', 'chrome', 'slack'],
  session: ['how-claude-code-works', 'common-workflows', 'checkpointing', 'settings', 'model-config', 'sandboxing', 'fast-mode', 'remote-control', 'desktop', 'devcontainer'],
  keyboard: ['interactive-mode', 'common-workflows', 'keybindings', 'statusline', 'terminal-config', 'output-styles'],
  bestpractices: ['best-practices', 'model-config', 'common-workflows', 'sandboxing'],
}

export const SUPPLEMENTARY_DOCS = ['settings', 'permissions', 'overview', 'agent-sdk-overview', 'setup', 'features-overview', 'desktop-quickstart', 'authentication']
