/**
 * Type declarations for Electron preload API
 */

interface UsageAnalysis {
  tools: Record<string, number>
  topics: { topic: string; hits: number }[]
  categoryScores: Record<string, number>
  recommendedIds: string[]
  sessionCount: number
  promptSamples: string[]
}

interface ElectronAPI {
  openExternal: (url: string) => Promise<boolean>
  copyToClipboard: (text: string) => Promise<boolean>
  exportProgress: (data: string) => Promise<{ success: boolean; error?: string }>
  importProgress: () => Promise<{ success: boolean; data?: string; error?: string }>
  exportCsv: (data: string, defaultFilename: string) => Promise<{ success: boolean; error?: string }>
  analyzeUsage: (daysBack: number) => Promise<UsageAnalysis | null>
  runRecommendSkill: () => Promise<{ success: boolean; error?: string }>
  isRecommendRunning: () => Promise<boolean>
  cancelRecommend: () => Promise<boolean>
  clearRecommendCache: () => Promise<void>
  exportLearnerProfile: (data: {
    patternHistory: unknown[]
    categoryProgress: Record<string, { accuracy: number; attemptedQuestions: number }>
    /** レコメンドで出した問題に絞ったカテゴリ別正答率 */
    recommendedAccuracy: Record<string, { correct: number; total: number }>
    totalAttempts: number
    totalXp: number
    streakDays: number
  }) => Promise<void>
  runOpusAnalysis: (
    trigger: 'initial' | 'monthly' | 'stagnation' | 'breakthrough' | 'mastery',
    context: string
  ) => Promise<{ success: boolean; result?: string; error?: string }>
  showNotification: (title: string, body: string) => Promise<void>
  setupGlobalHooks: (remove: boolean) => Promise<{ success: boolean; error?: string }>
  checkGlobalHooks: () => Promise<boolean>
  getClassifiedPrompts: () => Promise<{
    classifications: { id: number; intent: string; category: string; struggle: string; tip: string | null }[]
    summary: {
      intentClusters: { intent: string; promptIds: number[]; dominantStruggle: string; tip: string | null }[]
      categoryDistribution: Record<string, number>
      overallStruggles: { none: number; mild: number; strong: number }
    }
  } | null>
  rankQuestionsWithHaiku: (args: {
    questions: { id: string; question: string; category: string }[]
    userContext: string
  }) => Promise<string[] | null>
  setRealtimeMonitoring: (enabled: boolean) => Promise<void>
  getRealtimeMonitoring: () => Promise<boolean>
  onStartMicroQuiz: (callback: (data: { questionId: string; tip: string }) => void) => () => void
  onOpenRecommend: (callback: () => void) => () => void
  getCachedRecommend: () => Promise<{
    date: string
    sessionCount: number
    questionCount: number
    ids: string[]
    topCategories: string[]
    topics: { topic: string; hits: number }[]
    promptSamples: string[]
    reasons?: Record<string, string>
    coachingMessage?: string
  } | null>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
