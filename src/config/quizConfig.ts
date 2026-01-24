// Re-export types for convenience
export type {
  CategoryConfig,
  QuizModeConfig,
  DifficultyConfig,
} from '@/types/quiz'

import type {
  CategoryConfig,
  QuizModeConfig,
  DifficultyConfig,
} from '@/types/quiz'

/**
 * Quiz application configuration
 * All configurable options are centralized here for easy modification
 */

// ============================================================
// Category Definitions
// ============================================================

export const CATEGORIES: CategoryConfig[] = [
  {
    id: 'memory',
    name: 'Memory (CLAUDE.md)',
    description:
      'CLAUDE.md、@インポート、.claude/rules/による永続的なコンテキスト管理',
    icon: '📝',
    color: 'blue',
    weight: 15,
  },
  {
    id: 'skills',
    name: 'Skills',
    description: 'スキル作成、frontmatter設定、動的コンテキスト注入',
    icon: '✨',
    color: 'purple',
    weight: 15,
  },
  {
    id: 'tools',
    name: 'Tools',
    description: 'Read/Write/Edit/Bash/Glob/Grep等の組み込みツール',
    icon: '🔧',
    color: 'orange',
    weight: 15,
  },
  {
    id: 'commands',
    name: 'Commands',
    description: '/context、/compact、/init、!prefix等のコマンド操作',
    icon: '💻',
    color: 'emerald',
    weight: 15,
  },
  {
    id: 'extensions',
    name: 'Extensions',
    description: 'MCP、Hooks、Subagents、Pluginsによる拡張機能',
    icon: '🧩',
    color: 'pink',
    weight: 15,
  },
  {
    id: 'session',
    name: 'Session & Context',
    description: 'セッション管理、コンテキストウィンドウ、fork操作',
    icon: '📚',
    color: 'cyan',
    weight: 10,
  },
  {
    id: 'keyboard',
    name: 'Keyboard & UI',
    description: 'ショートカット、Vimモード、UI操作',
    icon: '⌨️',
    color: 'yellow',
    weight: 10,
  },
  {
    id: 'bestpractices',
    name: 'Best Practices',
    description: '効果的な使い方、プロンプト設計、ワークフロー',
    icon: '💡',
    color: 'green',
    weight: 5,
  },
]

// ============================================================
// Quiz Mode Definitions (with icons)
// ============================================================

interface QuizModeConfigWithIcon extends QuizModeConfig {
  icon: string
}

export const QUIZ_MODES: QuizModeConfigWithIcon[] = [
  {
    id: 'full',
    name: '本格試験モード',
    description: '全100問に挑戦（制限時間60分）',
    icon: '🎯',
    questionCount: null, // all questions
    timeLimit: 60, // 60 minutes
    shuffleQuestions: true,
    shuffleOptions: false,
  },
  {
    id: 'category',
    name: 'カテゴリ別学習',
    description: '選択したカテゴリの問題に集中',
    icon: '📂',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  },
  {
    id: 'random',
    name: 'ランダム20問',
    description: '全カテゴリからランダムに20問',
    icon: '🎲',
    questionCount: 20,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  },
  {
    id: 'weak',
    name: '苦手克服モード',
    description: '正答率の低い問題を優先出題',
    icon: '🔥',
    questionCount: 20,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  },
  {
    id: 'custom',
    name: 'カスタム',
    description: '問題数・時間・カテゴリを自由に設定',
    icon: '⚙️',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  },
]

// ============================================================
// Difficulty Definitions
// ============================================================

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: 'beginner',
    name: '初級',
    color: '#22C55E', // green
  },
  {
    id: 'intermediate',
    name: '中級',
    color: '#F59E0B', // amber
  },
  {
    id: 'advanced',
    name: '上級',
    color: '#EF4444', // red
  },
]

// ============================================================
// App Configuration
// ============================================================

export const APP_CONFIG = {
  title: 'Claude Code マスタークイズ',
  version: '2.0.0',
  passingScore: 70, // percentage
  storageKey: 'claude-code-quiz-progress',
  defaultMode: 'random' as const,
  weakThreshold: 50, // Questions with accuracy below this % are considered weak
  minAttemptsForWeak: 1, // Minimum attempts before a question can be marked as weak
}

// ============================================================
// Utility Functions
// ============================================================

export function getCategoryById(id: string): CategoryConfig | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export function getModeById(
  id: string
): QuizModeConfigWithIcon | undefined {
  return QUIZ_MODES.find((m) => m.id === id)
}

export function getDifficultyById(id: string): DifficultyConfig | undefined {
  return DIFFICULTIES.find((d) => d.id === id)
}

/**
 * Map color names to hex values
 * Used for dynamic styling where Tailwind classes can't be used
 */
const COLOR_MAP: Record<string, string> = {
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
  yellow: '#eab308',
  emerald: '#10b981',
  gray: '#6b7280',
}

/**
 * Get hex color from color name
 */
export function getColorHex(colorName: string): string {
  return COLOR_MAP[colorName] ?? COLOR_MAP.gray
}

/**
 * Get hex color for a category by its ID
 */
export function getCategoryColorById(categoryId: string): string {
  const category = getCategoryById(categoryId)
  return getColorHex(category?.color ?? 'gray')
}

/**
 * @deprecated Use getColorHex instead
 */
export function getCategoryColor(colorName: string): string {
  return getColorHex(colorName)
}

export function getDifficultyColor(difficultyId: string): string {
  return getDifficultyById(difficultyId)?.color ?? '#6B7280'
}

export function getDifficultyName(difficultyId: string): string {
  return getDifficultyById(difficultyId)?.name ?? difficultyId
}
