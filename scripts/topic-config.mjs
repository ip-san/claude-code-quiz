/**
 * Centralized topic-specific configuration for quiz build scripts.
 *
 * All doc pages, category mappings, backtick-lint term lists, and
 * terminology corrections that were previously scattered across
 * fetch-docs.mjs, quiz-constants.mjs, and quiz-lint.mjs are
 * consolidated here as single-source-of-truth exports.
 */

// ============================================================
// Documentation Pages
// ============================================================

/** All official doc pages (used by fetch-docs.mjs for caching). */
export const DOC_PAGES = [
  // Core
  { name: 'overview', url: 'https://code.claude.com/docs/en/overview' },
  { name: 'quickstart', url: 'https://code.claude.com/docs/en/quickstart' },
  { name: 'settings', url: 'https://code.claude.com/docs/en/settings' },
  { name: 'memory', url: 'https://code.claude.com/docs/en/memory' },
  // Interactive & Tools
  { name: 'interactive-mode', url: 'https://code.claude.com/docs/en/interactive-mode' },
  { name: 'how-claude-code-works', url: 'https://code.claude.com/docs/en/how-claude-code-works' },
  // Extensions & Integration
  { name: 'mcp', url: 'https://code.claude.com/docs/en/mcp' },
  { name: 'hooks', url: 'https://code.claude.com/docs/en/hooks' },
  { name: 'hooks-guide', url: 'https://code.claude.com/docs/en/hooks-guide' },
  { name: 'discover-plugins', url: 'https://code.claude.com/docs/en/discover-plugins' },
  { name: 'plugins', url: 'https://code.claude.com/docs/en/plugins' },
  { name: 'plugins-reference', url: 'https://code.claude.com/docs/en/plugins-reference' },
  { name: 'plugin-marketplaces', url: 'https://code.claude.com/docs/en/plugin-marketplaces' },
  { name: 'sub-agents', url: 'https://code.claude.com/docs/en/sub-agents' },
  { name: 'agent-teams', url: 'https://code.claude.com/docs/en/agent-teams' },
  { name: 'skills', url: 'https://code.claude.com/docs/en/skills' },
  // Advanced
  { name: 'common-workflows', url: 'https://code.claude.com/docs/en/common-workflows' },
  { name: 'checkpointing', url: 'https://code.claude.com/docs/en/checkpointing' },
  { name: 'best-practices', url: 'https://code.claude.com/docs/en/best-practices' },
  { name: 'model-config', url: 'https://code.claude.com/docs/en/model-config' },
  { name: 'sandboxing', url: 'https://code.claude.com/docs/en/sandboxing' },
  { name: 'headless', url: 'https://code.claude.com/docs/en/headless' },
  // Customization & UI
  { name: 'keybindings', url: 'https://code.claude.com/docs/en/keybindings' },
  { name: 'output-styles', url: 'https://code.claude.com/docs/en/output-styles' },
  { name: 'statusline', url: 'https://code.claude.com/docs/en/statusline' },
  { name: 'terminal-config', url: 'https://code.claude.com/docs/en/terminal-config' },
  { name: 'fast-mode', url: 'https://code.claude.com/docs/en/fast-mode' },
  // Platforms & IDE
  { name: 'vs-code', url: 'https://code.claude.com/docs/en/vs-code' },
  { name: 'jetbrains', url: 'https://code.claude.com/docs/en/jetbrains' },
  { name: 'desktop', url: 'https://code.claude.com/docs/en/desktop' },
  { name: 'chrome', url: 'https://code.claude.com/docs/en/chrome' },
  { name: 'slack', url: 'https://code.claude.com/docs/en/slack' },
  // CI/CD & Automation
  { name: 'github-actions', url: 'https://code.claude.com/docs/en/github-actions' },
  { name: 'gitlab-ci-cd', url: 'https://code.claude.com/docs/en/gitlab-ci-cd' },
  { name: 'scheduled-tasks', url: 'https://code.claude.com/docs/en/scheduled-tasks' },
  { name: 'remote-control', url: 'https://code.claude.com/docs/en/remote-control' },
  // Enterprise & Configuration
  { name: 'server-managed-settings', url: 'https://code.claude.com/docs/en/server-managed-settings' },
  { name: 'devcontainer', url: 'https://code.claude.com/docs/en/devcontainer' },
  // Supplementary (not for referenceUrl but useful for fact-checking)
  { name: 'permissions', url: 'https://code.claude.com/docs/en/permissions' },
  { name: 'cli-reference', url: 'https://code.claude.com/docs/en/cli-reference' },
  { name: 'setup', url: 'https://code.claude.com/docs/en/setup' },
  { name: 'features-overview', url: 'https://code.claude.com/docs/en/features-overview' },
  { name: 'desktop-quickstart', url: 'https://code.claude.com/docs/en/desktop-quickstart' },
  { name: 'authentication', url: 'https://code.claude.com/docs/en/authentication' },
  // Cloud & Provider
  { name: 'claude-code-on-the-web', url: 'https://code.claude.com/docs/en/claude-code-on-the-web' },
  { name: 'amazon-bedrock', url: 'https://code.claude.com/docs/en/amazon-bedrock' },
  { name: 'google-vertex-ai', url: 'https://code.claude.com/docs/en/google-vertex-ai' },
  { name: 'microsoft-foundry', url: 'https://code.claude.com/docs/en/microsoft-foundry' },
  { name: 'llm-gateway', url: 'https://code.claude.com/docs/en/llm-gateway' },
  // Enterprise & Security
  { name: 'network-config', url: 'https://code.claude.com/docs/en/network-config' },
  { name: 'third-party-integrations', url: 'https://code.claude.com/docs/en/third-party-integrations' },
  { name: 'analytics', url: 'https://code.claude.com/docs/en/analytics' },
  { name: 'monitoring-usage', url: 'https://code.claude.com/docs/en/monitoring-usage' },
  { name: 'security', url: 'https://code.claude.com/docs/en/security' },
  // Features
  { name: 'code-review', url: 'https://code.claude.com/docs/en/code-review' },
  { name: 'troubleshooting', url: 'https://code.claude.com/docs/en/troubleshooting' },
  // Agent SDK (different domain)
  { name: 'agent-sdk-overview', url: 'https://platform.claude.com/docs/en/agent-sdk/overview' },
]

// ============================================================
// Category → Doc Page Mapping
// ============================================================

/** Category to doc page mapping (used by verify-state.mjs and fetch-docs.mjs). */
export const CATEGORY_DOC_MAP = {
  memory: ['memory', 'best-practices', 'settings', 'server-managed-settings'],
  skills: ['skills', 'sub-agents', 'best-practices', 'agent-teams'],
  tools: ['how-claude-code-works', 'interactive-mode', 'sub-agents', 'vs-code', 'jetbrains'],
  commands: [
    'interactive-mode',
    'cli-reference',
    'common-workflows',
    'headless',
    'github-actions',
    'gitlab-ci-cd',
    'scheduled-tasks',
  ],
  extensions: [
    'mcp',
    'hooks',
    'hooks-guide',
    'discover-plugins',
    'plugins',
    'plugins-reference',
    'plugin-marketplaces',
    'settings',
    'chrome',
    'slack',
  ],
  session: [
    'how-claude-code-works',
    'common-workflows',
    'checkpointing',
    'settings',
    'model-config',
    'sandboxing',
    'fast-mode',
    'remote-control',
    'desktop',
    'devcontainer',
  ],
  keyboard: ['interactive-mode', 'common-workflows', 'keybindings', 'statusline', 'terminal-config', 'output-styles'],
  bestpractices: ['best-practices', 'model-config', 'common-workflows', 'sandboxing'],
}

/** Supplementary doc URLs (used by verify-state.mjs). */
export const SUPPLEMENTARY_DOCS = [
  'settings',
  'permissions',
  'overview',
  'agent-sdk-overview',
  'setup',
  'features-overview',
  'desktop-quickstart',
  'authentication',
]

// ============================================================
// URL Validation
// ============================================================

/** Primary domain prefix for referenceUrl validation in quiz-lint. */
export const DOC_URL_PREFIX = 'https://code.claude.com/docs/'

/** Additional valid domain prefixes for referenceUrl (e.g. related docs sites). */
export const ADDITIONAL_DOC_PREFIXES = ['https://platform.claude.com/docs/']

// ============================================================
// Backtick-Lint Term Lists
// ============================================================

/**
 * Terms that should ALWAYS be wrapped in backticks when appearing
 * outside of an existing backtick span in quiz text fields.
 */
export const BACKTICK_TERMS = {
  /** File paths & config files — sorted by length descending to match longer paths first. */
  filePaths: [
    '~/.claude/settings.json',
    '~/.claude/CLAUDE.md',
    '~/.claude/commands/',
    '~/.claude/skills/',
    '.claude/settings.json',
    '.claude/commands/',
    '.claude/rules/',
    '.claude/skills/',
    '.claude/tmp/',
    'CLAUDE.local.md',
    'CLAUDE.md',
    'settings.json',
    'package.json',
    '.gitignore',
    '.clauderc',
    '.mcp.json',
  ].sort((a, b) => b.length - a.length),

  /** Slash commands regex pattern. */
  slashCommands:
    /(?<!`|[/\w])(\/(init|memory|compact|clear|rewind|status|model|config|hooks|login|logout|bug|review|terminal-setup|teleport|doctor|cost|vim|rename|todos|tasks|search|ide|project|help|mcp|diff|permissions|listen))(?![-\w]|`)/g,

  /** Hook event names (PascalCase). */
  hookEvents: [
    'PreToolUse',
    'PostToolUse',
    'UserPromptSubmit',
    'Stop',
    'SubagentStop',
    'SessionStart',
    'SessionEnd',
    'Notification',
    'PermissionRequest',
    'TeammateIdle',
    'TaskCompleted',
    'ConfigChange',
    'WorktreeCreate',
  ],

  /** Built-in tool names (Agent/Task excluded — too many false positives with "Agent SDK" etc.). */
  toolNames: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'NotebookEdit', 'TodoWrite'],

  /** Config keys (camelCase / kebab-case identifiers from settings) — sorted by length descending. */
  configKeys: [
    'allowed-tools',
    'allowedTools',
    'context: fork',
    'defaultMode',
    'allowManagedHooksOnly',
    'permissions.deny',
    'permissions.allow',
    'spinnerVerbs.mode',
    'spinnerVerbs.verbs',
    'spinnerVerbs',
    'deniedMcpServers',
    'allowedMcpServers',
    'alwaysThinkingEnabled',
    'availableModels',
    'hookSpecificOutput',
  ].sort((a, b) => b.length - a.length),

  /** CLI commands (full invocations) — longer patterns first to match greedily. */
  cliCommands: [
    'git reset --hard',
    'git worktree remove',
    'brew install --cask claude-code',
    'npm test',
    'npm install',
    'npm run',
    'git commit',
    'git push',
    'git stash',
    'git reset',
    'git worktree',
    'claude --resume',
    'claude --continue',
    'claude --review',
    'claude --teleport',
    'claude install-mcp',
    'nvm use',
  ],
}

// ============================================================
// Terminology Dictionary
// ============================================================

/**
 * Known incorrect terms -> correct terms.
 * Built from known-issues.md and verified facts in MEMORY.md.
 */
export const TERMINOLOGY_DICT = [
  // Official names
  { wrong: 'Azure Foundry', correct: 'Microsoft Foundry', caseInsensitive: false },
  // "Claude Code SDK" — skip if context is clearly historical (e.g., "旧称", "以前は")
  { wrong: 'Claude Code SDK', correct: 'Claude Agent SDK', caseInsensitive: false, skipIfHistorical: true },
  // Non-existent commands/features (only flag in explanation, not in wrong-answer options)
  {
    wrong: 'claude commit',
    correct: null,
    message: '`claude commit` サブコマンドは存在しません',
    skipWrongOptions: true,
  },
  {
    wrong: /(?<!`)\/teleport(?!`)/,
    correct: null,
    message: '`/teleport` はスラッシュコマンドではなく `claude --teleport` CLIフラグです',
    skipWrongOptions: true,
  },
  // Terminology precision
  { wrong: 'allowed_tools', correct: 'allowed-tools', caseInsensitive: false },
  // Common misspellings in Japanese context
  { wrong: 'Exntended Thinking', correct: 'Extended Thinking', caseInsensitive: false },
  // Deprecated terminology
  {
    wrong: /(?<!\w)Task\s+tool(?!\w)/i,
    correct: null,
    message: 'CLI では Agent ツールに改名済み（SDK の allowedTools では Task を使用）',
  },
]
