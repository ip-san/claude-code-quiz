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
  setupGlobalHooks: (remove: boolean) => Promise<{ success: boolean; error?: string }>
  checkGlobalHooks: () => Promise<boolean>
  getCachedRecommend: () => Promise<{
    date: string
    sessionCount: number
    questionCount: number
    ids: string[]
    topCategories: string[]
    topics: { topic: string; hits: number }[]
    promptSamples: string[]
  } | null>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
