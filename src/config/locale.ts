/**
 * ロケール設定 — UI テキストのインターフェース定義
 *
 * 言語別の実装は locales/ ディレクトリに配置する。
 * 別言語を追加する場合:
 * 1. locales/en.ts 等を作成し LocaleConfig を実装
 * 2. 下部の activeLocale を切り替え
 *
 * テーマ固有テキスト（アプリ名、カテゴリ名等）は theme.ts が管理し、
 * 汎用UIテキスト（ボタンラベル、フィードバック等）はこのファイルが管理する。
 */

export interface LocaleConfig {
  // === Common ===
  readonly common: {
    readonly start: string
    readonly close: string
    readonly back: string
    readonly next: string
    readonly copied: string
    readonly questionSuffix: string
    readonly categorySuffix: string
    readonly approxMinutes: string
  }

  // === Welcome ===
  readonly welcome: {
    readonly startButton: string
  }

  // === Quiz Feedback ===
  readonly feedback: {
    readonly correct: string
    readonly incorrect: string
    readonly explanation: string
    readonly yourAnswer: string
    readonly correctAnswer: string
    readonly whyWrong: string
    readonly officialDocs: string
    readonly openDocs: string
    readonly copyMarkdown: string
    readonly markdownCopied: string
    readonly copyExplanation: string
    readonly aiLearnMore: string
    readonly promptCopied: string
    readonly actionButtons: string
    readonly prompts: {
      readonly explain: { label: string; description: string }
      readonly practical: { label: string; description: string }
      readonly compare: { label: string; description: string }
    }
  }

  // === Quiz Card ===
  readonly quizCard: {
    readonly noQuestions: string
    readonly bookmark: string
    readonly unbookmark: string
    readonly hint: string
    readonly usedHint: string
    readonly multiSelectGroup: string
    readonly singleSelectGroup: string
    readonly retryButton: string
    readonly retryLabel: string
  }

  // === Quiz Result ===
  readonly result: {
    readonly firstCongrats: string
    readonly reviewNote: string
    readonly starRating: string
    readonly nextRecommendation: string
    readonly tomorrowAction: string
    readonly passing: string
    readonly notPassing: string
    readonly nextStep: string
    readonly learnedAction: string
  }

  // === Certificate ===
  readonly certificate: {
    readonly congrats: string
    readonly canIssue: string
    readonly namePlaceholder: string
    readonly nameLabel: string
    readonly generating: string
    readonly download: string
  }

  // === Menu ===
  readonly menu: {
    readonly historyLabel: string
    readonly shortcutsLabel: string
    readonly themeToggle: string
    readonly answered: string
    readonly modeSection: string
    readonly otherModes: string
    readonly difficultySection: string
    readonly checkUpdate: string
  }

  // === Search ===
  readonly search: {
    readonly placeholder: string
    readonly label: string
    readonly closeLabel: string
    readonly noResults: string
    readonly resultsSuffix: string
    readonly searchResultsFor: string
  }

  // === Daily ===
  readonly daily: {
    readonly todaysPlan: string
    readonly reviewPrefix: string
    readonly goalPrefix: string
    readonly achieved: string
    readonly dailyGoalLabel: string
    readonly dailyGoalProgress: string
  }

  // === Streak ===
  readonly streak: {
    readonly daySuffix: string
    readonly consecutive: string
    readonly amazing20: string
    readonly great10: string
    readonly nice5: string
  }

  // === Progress ===
  readonly progress: {
    readonly title: string
    readonly totalAnswers: string
    readonly correctCount: string
    readonly accuracy: string
    readonly sessionCount: string
    readonly bestAccuracy: string
    readonly growthTrend: string
    readonly teachable: string
    readonly teachableDesc: string
    readonly accuracyPrefix: string
    readonly weakChallenge: string
    readonly exportLabel: string
    readonly importLabel: string
    readonly csvExport: string
    readonly resetLabel: string
    readonly chartTitle: string
    readonly chartLabel: string
    readonly past: string
    readonly latest: string
  }

  // === Mastery ===
  readonly mastery: {
    readonly nextPrefix: string
    readonly nextLevelProgress: string
    readonly maxLevel: string
  }

  // === Team Share ===
  readonly teamShare: {
    readonly heading: string
    readonly intro: string
    readonly copyButton: string
    readonly copyHint: string
  }

  // === Skills Acquired ===
  readonly skills: {
    readonly heading: string
  }

  // === Personal Best ===
  readonly personalBest: {
    readonly updated: string
  }

  // === Resume Session ===
  readonly resumeSession: {
    readonly discardLabel: string
    readonly discardButton: string
  }

  // === Install Prompt ===
  readonly install: {
    readonly useAsApp: string
  }

  // === Diagrams ===
  readonly diagrams: {
    readonly hierarchy: string
    readonly cycle: string
    readonly comparison: string
    readonly flow: string
    readonly highPriority: string
    readonly lowPriority: string
  }

  // === Timer ===
  readonly timer: {
    readonly remaining: (minutes: number, seconds: number) => string
  }

  // === Recommendation ===
  readonly recommendation: {
    readonly heading: string
    readonly newArea: string
    readonly allMastered: string
    readonly growthArea: string
    readonly expertGoal: string
    readonly retention: string
  }

  // === Weak Point ===
  readonly weakPoint: {
    readonly heading: string
  }

  // === Session History ===
  readonly sessionHistory: {
    readonly modes: Record<string, string>
  }

  // === Reader ===
  readonly reader: {
    readonly title: string
    readonly subtitle: string
    readonly allQuestions: string
    readonly bookmarked: string
    readonly wrongAnswers: string
    readonly weakAreas: string
    readonly unanswered: string
    readonly noResults: string
    readonly correctAnswer: string
    readonly countLabel: (filtered: number, total: number) => string
  }

  // === Streak Banner ===
  readonly streakBanner: {
    readonly milestones: {
      readonly day100: string
      readonly day60: string
      readonly day30: string
      readonly day14: string
      readonly day7: string
      readonly day3: string
    }
  }

  // === Tutorial ===
  readonly tutorial: {
    readonly skip: string
    readonly slideLabel: (index: number) => string
    readonly prevLabel: string
    readonly slides: ReadonlyArray<{
      readonly title: string
      readonly description: string
      readonly tip?: string
    }>
    readonly terminalYou: string
    readonly terminalClaude: string
    readonly terminalPrompt: string
    readonly terminalReply: string
    readonly terminalReplyCont: string
    readonly bubbles: readonly string[]
    readonly capabilities: ReadonlyArray<{ readonly label: string }>
    readonly pathSteps: ReadonlyArray<{
      readonly label: string
      readonly desc: string
    }>
  }

  // === Chapter Intro ===
  readonly chapterIntro: {
    readonly mistakesOkTitle: string
    readonly mistakesOkBody: string
    readonly learningPointsHeading: string
    readonly startLearning: string
    readonly startChapter: string
  }

  // === Study First ===
  readonly studyFirst: {
    readonly title: string
    readonly subtitle: string
    readonly howToLearnTitle: string
    readonly howToLearnBody: string
    readonly afterLearning: string
    readonly doneReading: string
    readonly readingDoneTitle: string
    readonly readingDoneBody: (questionCount: number) => string
    readonly startQuiz: string
    readonly reread: string
    readonly backToChapters: string
  }

  // === First Time Guide ===
  readonly firstTimeGuide: {
    readonly beginnerLabel: string
    readonly beginnerDesc: string
    readonly quizLearnLabel: string
    readonly quizLearnDesc: string
    readonly readFirstLabel: string
    readonly readFirstDesc: string
    readonly experiencedLabel: string
    readonly experiencedDesc: string
  }

  // === Menu Header ===
  readonly menuHeader: {
    readonly openMenu: string
    readonly closeMenu: string
    readonly menuLabel: string
    readonly aboutClaude: string
    readonly aboutClaudeDesc: string
    readonly quizModes: string
    readonly scenarioLabel: string
    readonly scenarioDesc: string
    readonly bookmarkLabel: string
    readonly bookmarkSaving: (count: number) => string
    readonly bookmarkEmpty: string
    readonly bookmarkHint: string
    readonly progressDesc: string
    readonly readFirstLabel: string
    readonly readFirstDesc: string
    readonly lightMode: string
    readonly darkMode: string
    readonly keyboardShortcuts: string
    readonly checking: string
    readonly latestVersion: string
    readonly checkFailed: string
    readonly updateCheck: string
    readonly streakFooter: (streak: number, count: number, goal: number) => string
    readonly dailyGoalLabel: (count: number, goal: number) => string
    readonly quizModesButton: string
    readonly quizModesDesc: string
    readonly streakBadge: (days: number) => string
  }

  // === Weak Point (extended) ===
  readonly weakPointDetail: {
    readonly wrongCountLabel: (count: number, accuracy: number) => string
    readonly reviewButton: string
    readonly weakTopics: string
    readonly openDocLabel: (label: string) => string
  }

  // === Scenario ===
  readonly scenario: {
    readonly epilogue: string
    readonly beforeQuestion: (current: number, total: number) => string
    readonly nextButton: string
    readonly difficultyLabels: Record<string, string>
    readonly questionStats: (total: number, answered: number) => string
  }

  // === Category Picker ===
  readonly categoryPicker: {
    readonly title: string
    readonly cancel: string
    readonly dialogLabel: string
  }
}

// ============================================================
// アクティブロケール — 言語切り替えはここを変更
// ============================================================

import { ja } from '@/config/locales/ja'

/** 現在のロケール設定。別言語に切り替える場合はインポートを差し替える */
export const locale: LocaleConfig = ja
