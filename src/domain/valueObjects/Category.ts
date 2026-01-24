/**
 * Category Value Object
 * Represents a quiz category with its configuration
 */
export interface CategoryProps {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon?: string
  readonly color?: string
  readonly weight?: number
}

export class Category {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly color: string
  readonly weight: number

  private constructor(props: CategoryProps) {
    this.id = props.id
    this.name = props.name
    this.description = props.description
    this.icon = props.icon ?? '📁'
    this.color = props.color ?? 'gray'
    this.weight = props.weight ?? 10
  }

  static create(props: CategoryProps): Category {
    if (!props.id || props.id.trim().length === 0) {
      throw new Error('Category ID is required')
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Category name is required')
    }
    return new Category(props)
  }

  equals(other: Category): boolean {
    return this.id === other.id
  }

  toJSON(): CategoryProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      color: this.color,
      weight: this.weight,
    }
  }
}

// Pre-defined categories for Claude Code Quiz
export const PREDEFINED_CATEGORIES: Category[] = [
  Category.create({
    id: 'memory',
    name: 'Memory (CLAUDE.md)',
    description: 'CLAUDE.md、@インポート、.claude/rules/による永続的なコンテキスト管理',
    icon: '📝',
    color: 'blue',
    weight: 15,
  }),
  Category.create({
    id: 'skills',
    name: 'Skills',
    description: 'スキル作成、frontmatter設定、動的コンテキスト注入',
    icon: '✨',
    color: 'purple',
    weight: 15,
  }),
  Category.create({
    id: 'tools',
    name: 'Tools',
    description: 'Read/Write/Edit/Bash/Glob/Grep等の組み込みツール',
    icon: '🔧',
    color: 'orange',
    weight: 15,
  }),
  Category.create({
    id: 'commands',
    name: 'Commands',
    description: '/context、/compact、/init、!prefix等のコマンド操作',
    icon: '💻',
    color: 'emerald',
    weight: 15,
  }),
  Category.create({
    id: 'extensions',
    name: 'Extensions',
    description: 'MCP、Hooks、Subagents、Pluginsによる拡張機能',
    icon: '🧩',
    color: 'pink',
    weight: 15,
  }),
  Category.create({
    id: 'session',
    name: 'Session & Context',
    description: 'セッション管理、コンテキストウィンドウ、fork操作',
    icon: '📚',
    color: 'cyan',
    weight: 10,
  }),
  Category.create({
    id: 'keyboard',
    name: 'Keyboard & UI',
    description: 'ショートカット、Vimモード、UI操作',
    icon: '⌨️',
    color: 'yellow',
    weight: 10,
  }),
  Category.create({
    id: 'bestpractices',
    name: 'Best Practices',
    description: '効果的な使い方、プロンプト設計、ワークフロー',
    icon: '💡',
    color: 'green',
    weight: 5,
  }),
]

export function getCategoryById(id: string): Category | undefined {
  return PREDEFINED_CATEGORIES.find(c => c.id === id)
}
