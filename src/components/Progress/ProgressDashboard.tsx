import { useState } from 'react'
import { useQuizStore } from '@/stores/quizStore'
import { CATEGORIES, getColorHex } from '@/config/quizConfig'
import type { CategoryConfig } from '@/types/quiz'
import {
  getOverallAccuracy,
  exportProgressToJson,
  importProgressFromJson,
  saveProgress,
} from '@/lib/progressStorage'

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
  } = useQuizStore()

  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const categoryStats = getCategoryStats()
  const overallAccuracy = getOverallAccuracy(userProgress)

  const handleWeakMode = () => {
    startSession({ mode: 'weak' })
  }

  const handleResetProgress = () => {
    if (
      window.confirm('学習履歴をリセットしますか？この操作は取り消せません。')
    ) {
      resetUserProgress()
    }
  }

  const handleExport = async () => {
    try {
      const jsonData = exportProgressToJson(userProgress)
      const result = await window.electronAPI.exportProgress(jsonData)

      if (result.success) {
        setExportStatus('エクスポートしました')
        setTimeout(() => setExportStatus(null), 3000)
      } else if (result.error !== 'cancelled') {
        setExportStatus(`エラー: ${result.error}`)
        setTimeout(() => setExportStatus(null), 5000)
      }
    } catch (error) {
      setExportStatus('エクスポートに失敗しました')
      setTimeout(() => setExportStatus(null), 5000)
    }
  }

  const handleImport = async () => {
    try {
      const result = await window.electronAPI.importProgress()

      if (result.success && result.data) {
        const parsed = importProgressFromJson(result.data)

        if (parsed) {
          if (
            window.confirm(
              '現在の学習履歴を上書きしますか？この操作は取り消せません。'
            )
          ) {
            saveProgress(parsed)
            loadUserProgress()
            setExportStatus('インポートしました')
            setTimeout(() => setExportStatus(null), 3000)
          }
        } else {
          setExportStatus('無効なファイル形式です')
          setTimeout(() => setExportStatus(null), 5000)
        }
      } else if (result.error !== 'cancelled') {
        setExportStatus(`エラー: ${result.error}`)
        setTimeout(() => setExportStatus(null), 5000)
      }
    } catch (error) {
      setExportStatus('インポートに失敗しました')
      setTimeout(() => setExportStatus(null), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">学習進捗</h1>
            <p className="text-slate-400">
              あなたの学習状況を確認できます
            </p>
          </div>
          <button
            onClick={() => setViewState('menu')}
            className="rounded-lg border border-slate-600 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-700"
          >
            戻る
          </button>
        </div>

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

        {/* Category Progress */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            カテゴリ別進捗
          </h2>
          <div className="space-y-3">
            {CATEGORIES.map((category: CategoryConfig) => {
              const stats = categoryStats[category.id]
              const progress = stats
                ? Math.round((stats.correctAnswers / Math.max(stats.attemptedQuestions, 1)) * 100)
                : 0
              const attempted = stats?.attemptedQuestions ?? 0
              const total = stats?.totalQuestions ?? 0

              return (
                <div
                  key={category.id}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="font-medium text-white">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {attempted}/{total}問回答済み
                    </span>
                  </div>
                  <div className="mb-1 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(attempted / Math.max(total, 1)) * 100}%`,
                        backgroundColor: getColorHex(category.color ?? 'gray'),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
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
              className="flex-1 rounded-lg bg-orange-600 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-700"
            >
              🎯 苦手問題に挑戦
            </button>
          </div>

          {/* Export/Import buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleExport}
              aria-label="学習履歴をエクスポートする"
              className="flex-1 rounded-lg border border-slate-600 px-6 py-3 text-slate-300 transition-colors hover:bg-slate-700"
            >
              📥 履歴をエクスポート
            </button>
            <button
              onClick={handleImport}
              aria-label="学習履歴をインポートする"
              className="flex-1 rounded-lg border border-slate-600 px-6 py-3 text-slate-300 transition-colors hover:bg-slate-700"
            >
              📤 履歴をインポート
            </button>
          </div>

          {/* Status message */}
          {exportStatus && (
            <div
              className={`rounded-lg px-4 py-2 text-center text-sm ${
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
            className="w-full rounded-lg border border-red-600/50 px-6 py-3 text-red-400 transition-colors hover:bg-red-600/20"
          >
            履歴をリセット
          </button>
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
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="mb-1 text-2xl">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  )
}
