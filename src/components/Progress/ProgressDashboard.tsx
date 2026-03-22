import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { platformAPI } from '@/lib/platformAPI'
import { PREDEFINED_CATEGORIES, type Category } from '@/domain/valueObjects/Category'
import { getProgressRepository } from '@/infrastructure/persistence/LocalStorageProgressRepository'
import { SessionHistoryChart } from './SessionHistoryChart'
import { SessionHistoryList } from './SessionHistoryList'
import { SessionInsightService } from '@/domain/services/SessionInsightService'

import { getColorHex } from '@/lib/colors'

/**
 * Progress Dashboard component
 * Displays learning progress, category stats, and weak points
 */
export function ProgressDashboard() {
  const {
    userProgress,
    getCategoryStats,
    setViewState,
    startSession,
    resetUserProgress,
    loadUserProgress,
    exportProgressCsv,
  } = useQuizStore()

  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // タイムアウトのクリーンアップ（メモリリーク防止）
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [])

  // ステータスメッセージを表示して自動クリア
  const showStatus = useCallback((message: string, duration: number = 3000) => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current)
    }
    setExportStatus(message)
    statusTimeoutRef.current = setTimeout(() => {
      setExportStatus(null)
      statusTimeoutRef.current = null
    }, duration)
  }, [])

  const categoryStats = getCategoryStats()
  const overallAccuracy = userProgress.getOverallAccuracy()

  // Empty state check
  const hasNoProgress = userProgress.totalAttempts === 0

  const handleWeakMode = () => {
    startSession({ mode: 'weak' })
  }

  const handleResetProgress = async () => {
    if (
      window.confirm('学習履歴をリセットしますか？この操作は取り消せません。')
    ) {
      await resetUserProgress()
    }
  }

  const handleExport = async () => {
    try {
      const progressRepo = getProgressRepository()
      const jsonData = await progressRepo.export()
      const result = await platformAPI.exportProgress(jsonData)

      if (result.success) {
        showStatus('エクスポートしました')
      } else if ('error' in result && result.error !== 'cancelled') {
        showStatus(`エラー: ${result.error}`, 5000)
      }
    } catch {
      showStatus('エクスポートに失敗しました', 5000)
    }
  }

  const handleCsvExport = async () => {
    try {
      await exportProgressCsv()
      showStatus('CSVをエクスポートしました')
    } catch {
      showStatus('CSVエクスポートに失敗しました', 5000)
    }
  }

  const handleImport = async () => {
    try {
      const result = await platformAPI.importProgress()

      if (result.success && result.data) {
        if (
          window.confirm(
            '現在の学習履歴を上書きしますか？この操作は取り消せません。'
          )
        ) {
          const progressRepo = getProgressRepository()
          const success = await progressRepo.import(result.data)

          if (success) {
            await loadUserProgress()
            showStatus('インポートしました')
          } else {
            showStatus('無効なファイル形式です', 5000)
          }
        }
      } else if (result.error !== 'cancelled') {
        showStatus(`エラー: ${result.error}`, 5000)
      }
    } catch {
      showStatus('インポートに失敗しました', 5000)
    }
  }

  return (
    <div className="min-h-screen bg-claude-cream">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-claude-cream/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex items-center justify-between sm:max-w-2xl lg:max-w-4xl">
          <h1 className="text-lg font-bold text-claude-dark">学習進捗</h1>
          <button
            onClick={() => setViewState('menu')}
            className="tap-highlight rounded-full bg-stone-100 px-4 py-1.5 text-sm font-medium text-stone-600"
          >
            閉じる
          </button>
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 sm:px-6">
        <div className="mx-auto sm:max-w-2xl lg:max-w-4xl">

        {/* Empty State */}
        {hasNoProgress && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="mb-2 text-lg font-medium text-claude-dark">
              まだ学習履歴がありません
            </h3>
            <p className="mb-4 text-sm text-stone-500">
              クイズに挑戦して学習を始めましょう
            </p>
            <button
              onClick={() => setViewState('menu')}
              className="rounded-2xl bg-claude-orange px-6 py-2 text-white hover:bg-claude-orange/90"
            >
              クイズを始める
            </button>
          </div>
        )}

        {/* Overall Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="総回答数"
            value={userProgress.totalAttempts}
            icon="📝"
          />
          <StatCard
            label="正解数"
            value={userProgress.totalCorrect}
            icon="✅"
          />
          <StatCard
            label="正答率"
            value={`${overallAccuracy}%`}
            icon="📊"
          />
          <StatCard
            label="連続学習"
            value={`${userProgress.streakDays}日`}
            icon="🔥"
          />
        </div>

        {/* Session History Chart */}
        {!hasNoProgress && (
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-claude-dark">
              正答率の推移
            </h2>
            <SessionHistoryChart sessions={userProgress.sessionHistory} />
          </div>
        )}

        {/* Learning Insights */}
        {!hasNoProgress && (() => {
          const trend = SessionInsightService.getImprovementTrend(userProgress.sessionHistory)
          const best = SessionInsightService.getBestScore(userProgress.sessionHistory)
          if (trend === null && best === null) return null
          return (
            <div className="mb-6 flex flex-wrap gap-3">
              {best !== null && (
                <div className="flex-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="mb-1 text-xs text-stone-500">最高正答率</div>
                  <div className="text-2xl font-bold text-claude-orange">{best}%</div>
                </div>
              )}
              {trend !== null && (
                <div className="flex-1 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="mb-1 text-xs text-stone-500">成長トレンド</div>
                  <div className={`text-2xl font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trend >= 0 ? '+' : ''}{trend}%
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Session History List */}
        {!hasNoProgress && userProgress.sessionHistory.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-4 text-lg font-semibold text-claude-dark">
              最近のセッション
            </h2>
            <SessionHistoryList sessions={userProgress.sessionHistory} limit={5} />
          </div>
        )}

        {/* Category Progress */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-claude-dark">
            カテゴリ別進捗
          </h2>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            {PREDEFINED_CATEGORIES.map((category: Category) => {
              const stats = categoryStats[category.id]
              const progress = stats
                ? Math.round((stats.correctAnswers / Math.max(stats.attemptedQuestions, 1)) * 100)
                : 0
              const attempted = stats?.attemptedQuestions ?? 0
              const total = stats?.totalQuestions ?? 0

              return (
                <div
                  key={category.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="font-medium text-claude-dark">
                        {category.name}
                      </span>
                      {progress >= 90 && <span className="text-xs">🏆</span>}
                      {progress >= 70 && progress < 90 && <span className="text-xs">⭐</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${progress >= 70 ? 'text-green-600' : progress >= 50 ? 'text-amber-600' : 'text-stone-500'}`}>
                        {progress}%
                      </span>
                      <span className="text-xs text-stone-400">
                        {attempted}/{total}
                      </span>
                    </div>
                  </div>
                  <div className="mb-1 h-2 overflow-hidden rounded-full bg-stone-200">
                    <div
                      className="h-full animate-progress-fill rounded-full progress-gradient"
                      style={{
                        width: `${(attempted / Math.max(total, 1)) * 100}%`,
                        backgroundColor: getColorHex(category.color ?? 'gray'),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>正答率: {progress}%</span>
                    <span>
                      {stats?.correctAnswers ?? 0}問正解 / {attempted - (stats?.correctAnswers ?? 0)}問不正解
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleWeakMode}
              aria-label="苦手問題に挑戦する"
              className="tap-highlight flex-1 rounded-2xl bg-claude-orange px-6 py-3 font-semibold text-white"
            >
              🎯 苦手問題に挑戦
            </button>
          </div>

          {/* Export/Import buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleExport}
              aria-label="学習履歴をエクスポートする"
              className="tap-highlight flex-1 rounded-2xl border border-stone-300 px-6 py-3 font-semibold text-stone-600"
            >
              📥 履歴をエクスポート
            </button>
            <button
              onClick={handleImport}
              aria-label="学習履歴をインポートする"
              className="tap-highlight flex-1 rounded-2xl border border-stone-300 px-6 py-3 font-semibold text-stone-600"
            >
              📤 履歴をインポート
            </button>
          </div>

          {/* CSV Export button */}
          <button
            onClick={handleCsvExport}
            aria-label="CSVで進捗をエクスポートする"
            className="tap-highlight w-full rounded-2xl border border-stone-300 px-6 py-3 font-semibold text-stone-600"
          >
            📊 CSVでエクスポート（管理者向け）
          </button>

          {/* Status message */}
          {exportStatus && (
            <div
              className={`rounded-2xl px-4 py-2 text-center text-sm ${
                exportStatus.startsWith('エラー') || exportStatus.includes('失敗')
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
              role="status"
              aria-live="polite"
            >
              {exportStatus}
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={handleResetProgress}
            aria-label="学習履歴をリセットする"
            className="tap-highlight w-full rounded-2xl border border-red-600/50 px-6 py-3 font-semibold text-red-400"
          >
            履歴をリセット
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: string
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="animate-card-enter rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-2xl">{icon}</div>
      <div className="text-2xl font-bold text-claude-dark">{value}</div>
      <div className="text-sm text-stone-500">{label}</div>
    </div>
  )
}
