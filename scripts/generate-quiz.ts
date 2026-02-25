/**
 * Claude Code Quiz Generator
 *
 * クイズ問題のテンプレートとAI生成プロンプトを出力するスクリプト。
 * カスタムスキル /generate-quiz-data の補助ツールとして使用。
 *
 * Usage:
 *   npx tsx scripts/generate-quiz.ts
 *
 * Output:
 *   - カテゴリ別の問題テンプレート
 *   - AI生成用プロンプト
 *
 * Note:
 *   実際の問題生成には /generate-quiz-data スキルの使用を推奨。
 *   このスクリプトはテンプレート構造の確認用。
 */

interface QuizTemplate {
  id: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  question: string
  options: Array<{ text: string; wrongFeedback?: string }>
  correctIndex: number
  explanation: string
  referenceUrl?: string
}

interface DocumentSection {
  category: string
  title: string
  idPrefix: string
  description: string
  topics: string[]
  referenceUrls: string[]
  targetQuestionCount: number
}

// Claude Code Documentation Structure (14 pages, 8 categories)
const DOCUMENTATION_SECTIONS: DocumentSection[] = [
  {
    category: 'memory',
    title: 'Memory (CLAUDE.md)',
    idPrefix: 'mem',
    description: 'CLAUDE.md、@インポート、.claude/rules/、永続的コンテキスト管理、Auto Memory',
    topics: [
      'CLAUDE.md ファイルの目的と配置場所',
      'メモリ階層 (managed > user > project > local)',
      '@import 構文によるファイルインクルード（最大5階層再帰）',
      'CLAUDE.local.md（個人設定、gitignore対象）',
      '.claude/rules/ ディレクトリ構造とYAML frontmatter',
      'Auto Memory（自動メモリ、~/.claude/projects/配下）',
      'メモリファイルの上方再帰読み込み',
      'ベストプラクティスと組織化',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/memory',
    ],
    targetQuestionCount: 28,
  },
  {
    category: 'skills',
    title: 'Skills',
    idPrefix: 'skill',
    description: 'カスタムスキル作成、frontmatter設定、動的コンテキスト注入、スラッシュコマンド',
    topics: [
      'スキルファイル構造と配置場所（.claude/skills/）',
      'YAML frontmatter設定（name, description, allowed-tools）',
      '/skill-name でのスキル呼び出し',
      '動的コンテキスト注入（$ARGUMENTS）',
      'スキルのスコープ（User / Project）',
      'context: fork によるサブエージェント実行',
      'スキル vs サブエージェントの使い分け',
      'allowed-tools によるツール制限',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/how-claude-code-works',
    ],
    targetQuestionCount: 26,
  },
  {
    category: 'tools',
    title: 'Tools',
    idPrefix: 'tool',
    description: 'Read/Write/Edit/Bash/Glob/Grep/WebFetch等の組み込みツール、サンドボックス',
    topics: [
      'Read ツール（ファイル読み取り、PDF対応）',
      'Write/Edit ツール（ファイル作成・編集）',
      'Bash ツール（コマンド実行、タイムアウト）',
      'Glob ツール（ファイルパターン検索）',
      'Grep ツール（ripgrep、コンテンツ検索）',
      'サンドボックス（sandbox設定、ネットワーク制御）',
      'BASH_MAX_OUTPUT_LENGTH、CLAUDE_CODE_SHELL',
      'パーミッションルール構文（Tool(specifier)）',
      'CLAUDE_CODE_SIMPLE、SHELL_PREFIX',
      'MCP_TOOL_TIMEOUT、mTLS設定',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/how-claude-code-works',
      'https://code.claude.com/docs/en/settings',
    ],
    targetQuestionCount: 40,
  },
  {
    category: 'commands',
    title: 'Commands',
    idPrefix: 'cmd',
    description: 'CLIコマンド、スラッシュコマンド、フラグ、GitHub Actions / GitLab CI/CD統合',
    topics: [
      '/init、/compact、/clear、/help コマンド',
      '/context、/add-dir コマンド',
      '/rewind、/agents、/statusline コマンド',
      '/teleport、/desktop コマンド',
      '/login コマンド（アカウント切り替え）',
      'claude "task"、claude -p、claude -c、claude -r フラグ',
      'claude commit コマンド',
      '--allowedTools、--permission-mode フラグ',
      '--dangerously-skip-permissions（CI/CD用）',
      '--output-format（json/stream-json/text）',
      '--worktree、--from-pr フラグ',
      'GitHub Actions / GitLab CI/CD 統合',
      'Unix哲学に基づくパイプライン連携',
      '? キー（ショートカット一覧）',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/interactive-mode',
      'https://code.claude.com/docs/en/quickstart',
      'https://code.claude.com/docs/en/overview',
    ],
    targetQuestionCount: 50,
  },
  {
    category: 'extensions',
    title: 'Extensions',
    idPrefix: 'ext',
    description: 'MCP、Hooks、Subagents、Plugins、マーケットプレイス',
    topics: [
      'MCP (Model Context Protocol) 概要と設定',
      'MCPサーバースコープ（Local/Project/User）',
      'MCP管理コマンド（list/remove/add-from-claude-desktop）',
      'Hooksイベント（PreToolUse, PostToolUse, Stop, Notification等）',
      'Hooks matcher と exit code（0:許可, 2:ブロック）',
      'サブエージェント概要（no nesting制約）',
      'ビルトインエージェント（Explore, Plan, General-purpose, Bash）',
      '/agents コマンド（管理インターフェース）',
      '--agents CLIフラグ（セッション限定JSON）',
      'フロントマター（name, description, tools, model, permissionMode等）',
      'Task(agent_type) 構文',
      'メモリスコープ（user/project/local）',
      'Foreground vs Background 実行（Ctrl+B）',
      'isolation: worktree',
      'サブエージェントの再開（agent ID）',
      'プラグインマーケットプレイス（7つのソースタイプ）',
      'strictKnownMarketplaces、enabledPlugins',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/mcp',
      'https://code.claude.com/docs/en/hooks',
      'https://code.claude.com/docs/en/sub-agents',
      'https://code.claude.com/docs/en/discover-plugins',
    ],
    targetQuestionCount: 75,
  },
  {
    category: 'session',
    title: 'Session & Context',
    idPrefix: 'ses',
    description: 'セッション管理、設定、チェックポイント、プロバイダー、インストール',
    topics: [
      '設定スコープ優先順位（Managed > CLI > Local > Project > User）',
      '設定ファイル場所（settings.json、.claude.json）',
      'Managed設定パス（macOS/Linux/Windows）',
      'cleanupPeriodDays、apiKeyHelper',
      'availableModels、alwaysThinkingEnabled',
      'CLAUDE_CODE_EFFORT_LEVEL（low/medium/high）',
      'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE',
      'プロキシ設定（HTTP_PROXY等）',
      'チェックポイント（自動作成、/rewind、5アクション）',
      'Summarize vs /compact vs Fork',
      '5つの利用環境（Terminal/VS Code/Desktop/Web/JetBrains）',
      'クロスサーフェス一貫性',
      '認証方法（Claude/Console/Bedrock/Vertex/Foundry）',
      'インストール方法（ネイティブ/Homebrew/WinGet）',
      'Agent SDK',
      'テレメトリ設定（DISABLE_TELEMETRY等）',
      'attribution設定、companyAnnouncements',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/settings',
      'https://code.claude.com/docs/en/checkpointing',
      'https://code.claude.com/docs/en/overview',
      'https://code.claude.com/docs/en/quickstart',
    ],
    targetQuestionCount: 78,
  },
  {
    category: 'keyboard',
    title: 'Keyboard & UI',
    idPrefix: 'key',
    description: 'キーボードショートカット、Vimモード、UI操作',
    topics: [
      'Escape/Ctrl+C 操作',
      'Shift+Tab（パーミッションモードサイクル）',
      'Ctrl+F/T/O/G/R/D 操作',
      'Option+T/P（モデル/プロバイダー切り替え）',
      'Vimモード（/vim で有効化）',
      'Ctrl+K/U/Y（行操作）',
      'Alt+B/F（単語移動）',
      'Ctrl+B（バックグラウンド移行）',
      '? キー（ショートカット一覧）',
      'Tab（コマンド補完）、/ （コマンド・スキル一覧）',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/interactive-mode',
    ],
    targetQuestionCount: 26,
  },
  {
    category: 'bestpractices',
    title: 'Best Practices',
    idPrefix: 'bp',
    description: '効果的な使い方、プロンプト設計、ワークフロー、アンチパターン',
    topics: [
      'Delegate, don\'t dictate（委任 vs 指示）',
      'フロントローディング（事前コンテキスト提供）',
      'Kitchen sink アンチパターン',
      'Correcting over and over アンチパターン',
      'Over-specified CLAUDE.md アンチパターン',
      'Trust-then-verify gap アンチパターン',
      'TDDワークフロー',
      'バグ修正・リファクタリング戦略',
      'Pro Tips（具体的な指示、ステップ分割、探索優先）',
      '自動化ワークフロー（GitHub Actions等）',
    ],
    referenceUrls: [
      'https://code.claude.com/docs/en/best-practices',
      'https://code.claude.com/docs/en/common-workflows',
      'https://code.claude.com/docs/en/quickstart',
    ],
    targetQuestionCount: 29,
  },
]

function generateQuizTemplate(
  section: DocumentSection,
  topicIndex: number,
  questionIndex: number
): QuizTemplate {
  const topic = section.topics[topicIndex % section.topics.length]
  const difficulty = questionIndex < 5 ? 'beginner' : questionIndex < 10 ? 'intermediate' : 'advanced'

  return {
    id: `${section.idPrefix}-${String(questionIndex + 1).padStart(3, '0')}`,
    category: section.category,
    difficulty,
    question: `[${topic}に関する問題をここに記述]`,
    options: [
      { text: '[正解の選択肢]' },
      { text: '[不正解の選択肢1]', wrongFeedback: '[なぜ間違いかの説明]' },
      { text: '[不正解の選択肢2]', wrongFeedback: '[なぜ間違いかの説明]' },
      { text: '[不正解の選択肢3]', wrongFeedback: '[なぜ間違いかの説明]' },
    ],
    correctIndex: 0,
    explanation: `[${topic}についての詳細な解説をここに記述]`,
    referenceUrl: section.referenceUrls[0],
  }
}

function generateAIPrompt(section: DocumentSection): string {
  return `
## ${section.title} - Quiz Generation Prompt

Please generate quiz questions about Claude Code's "${section.title}" feature.

### Category: ${section.category}
### ID Prefix: ${section.idPrefix}
### Description: ${section.description}
### Reference URLs:
${section.referenceUrls.map(url => `- ${url}`).join('\n')}

### Topics to Cover:
${section.topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

### Requirements:
1. Difficulty distribution: ~28% beginner, ~45% intermediate, ~27% advanced
2. Each question: 4 options (1 correct without wrongFeedback, 3 incorrect with wrongFeedback)
3. All text in Japanese
4. referenceUrl pointing to code.claude.com/docs/en/...
5. After generation, run: npm run quiz:randomize && npm run quiz:check && npm test
`
}

function main() {
  console.log('Claude Code Quiz Generator\n')
  console.log('='.repeat(50))
  console.log(`Total categories: ${DOCUMENTATION_SECTIONS.length}`)
  console.log(`Total target questions: ${DOCUMENTATION_SECTIONS.reduce((sum, s) => sum + s.targetQuestionCount, 0)}`)

  // Generate templates
  const templates: QuizTemplate[] = []

  for (const section of DOCUMENTATION_SECTIONS) {
    console.log(`\n${section.title}`)
    console.log(`  Topics: ${section.topics.length}`)
    console.log(`  Current target: ${section.targetQuestionCount}`)

    for (let i = 0; i < Math.min(section.targetQuestionCount, 3); i++) {
      templates.push(generateQuizTemplate(section, i, i))
    }
  }

  // Output AI prompts
  console.log('\n' + '='.repeat(50))
  console.log('\nAI Generation Prompts:')
  console.log('-'.repeat(50))

  for (const section of DOCUMENTATION_SECTIONS) {
    console.log(generateAIPrompt(section))
    console.log('-'.repeat(50))
  }

  // Summary
  console.log('\nSummary by Category:')
  for (const section of DOCUMENTATION_SECTIONS) {
    console.log(`  ${section.category.padEnd(15)} ${section.targetQuestionCount} questions (${section.idPrefix}-NNN)`)
  }

  console.log('\nRecommended workflow:')
  console.log('1. Use /generate-quiz-data skill for actual generation')
  console.log('2. npm run quiz:randomize')
  console.log('3. npm run quiz:check')
  console.log('4. npm test')
  console.log('5. npm run quiz:stats && npm run quiz:coverage')

  return templates
}

// Export for programmatic use
export { generateQuizTemplate, generateAIPrompt, DOCUMENTATION_SECTIONS }

// Run if called directly (ESM compatible)
import { fileURLToPath } from 'url'
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
