/**
 * Re-export from src/ for Electron IPC usage.
 * Business logic lives in src/infrastructure/recommend/recommendHandlers.ts.
 */
export {
  analyzeUsageFromContents,
  type CachedRecommendData,
  type FileReader,
  getCachedRecommendData,
} from '../src/infrastructure/recommend/recommendHandlers'
