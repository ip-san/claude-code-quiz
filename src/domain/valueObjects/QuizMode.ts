/**
 * QuizMode Value Object
 * Represents different quiz session modes
 */
export type QuizModeId = 'full' | 'category' | 'random' | 'weak' | 'unanswered' | 'custom' | 'bookmark' | 'review' | 'overview'

export interface QuizModeProps {
  readonly id: QuizModeId
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly questionCount: number | null
  readonly timeLimit: number | null
  readonly shuffleQuestions: boolean
  readonly shuffleOptions: boolean
}

export class QuizMode {
  readonly id: QuizModeId
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly questionCount: number | null
  readonly timeLimit: number | null
  readonly shuffleQuestions: boolean
  readonly shuffleOptions: boolean

  private constructor(props: QuizModeProps) {
    this.id = props.id
    this.name = props.name
    this.description = props.description
    this.icon = props.icon
    this.questionCount = props.questionCount
    this.timeLimit = props.timeLimit
    this.shuffleQuestions = props.shuffleQuestions
    this.shuffleOptions = props.shuffleOptions
  }

  static create(props: QuizModeProps): QuizMode {
    const validModes: QuizModeId[] = ['full', 'category', 'random', 'weak', 'unanswered', 'custom', 'bookmark', 'review', 'overview']
    if (!validModes.includes(props.id)) {
      throw new Error(`Invalid quiz mode: ${props.id}`)
    }
    return new QuizMode(props)
  }

  static fromId(id: QuizModeId): QuizMode {
    const mode = PREDEFINED_QUIZ_MODES.find(m => m.id === id)
    if (!mode) {
      throw new Error(`Unknown quiz mode: ${id}`)
    }
    return mode
  }

  hasTimeLimit(): boolean {
    return this.timeLimit !== null && this.timeLimit > 0
  }

  hasQuestionLimit(): boolean {
    return this.questionCount !== null && this.questionCount > 0
  }

  equals(other: QuizMode): boolean {
    return this.id === other.id
  }

  toJSON(): QuizModeProps {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon,
      questionCount: this.questionCount,
      timeLimit: this.timeLimit,
      shuffleQuestions: this.shuffleQuestions,
      shuffleOptions: this.shuffleOptions,
    }
  }
}

// Pre-defined quiz modes
export const PREDEFINED_QUIZ_MODES: QuizMode[] = [
  QuizMode.create({
    id: 'overview',
    name: '全体像モード',
    description: 'Claude Codeの全機能を幅広くカバー',
    icon: '🗺️',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: false,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'full',
    name: '実力テスト',
    description: '全カテゴリから100問に挑戦（制限時間60分）',
    icon: '🎯',
    questionCount: 100,
    timeLimit: 60,
    shuffleQuestions: true,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'category',
    name: 'カテゴリ別学習',
    description: '選択したカテゴリの問題に集中',
    icon: '📂',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'random',
    name: 'ランダム20問',
    description: '全カテゴリからランダムに20問',
    icon: '🎲',
    questionCount: 20,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'weak',
    name: '苦手克服モード',
    description: '正答率の低い問題を優先出題',
    icon: '🔥',
    questionCount: 20,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'unanswered',
    name: '未解答チャレンジ',
    description: 'まだ解いたことのない問題に挑戦',
    icon: '🆕',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'custom',
    name: 'カスタム',
    description: '問題数・時間・カテゴリを自由に設定',
    icon: '⚙️',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'bookmark',
    name: 'ブックマーク復習',
    description: 'ブックマークした問題を集中学習',
    icon: '⭐',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: true,
    shuffleOptions: false,
  }),
  QuizMode.create({
    id: 'review',
    name: '間違い復習',
    description: '間違えた問題を解説付きで復習',
    icon: '📖',
    questionCount: null,
    timeLimit: null,
    shuffleQuestions: false,
    shuffleOptions: false,
  }),
]

export function getQuizModeById(id: QuizModeId): QuizMode | undefined {
  return PREDEFINED_QUIZ_MODES.find(m => m.id === id)
}
