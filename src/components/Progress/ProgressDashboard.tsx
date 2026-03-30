import { ChevronDown, ChevronUp } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getMasteryLevel } from '@/domain/services/MasteryLevelService'
import { SessionInsightService } from '@/domain/services/SessionInsightService'
import { type Category, PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'
import { getProgressRepository } from '@/infrastructure/persistence/LocalStorageProgressRepository'
import { getColorHex } from '@/lib/colors'
import { platformAPI } from '@/lib/platformAPI'
import { buttonStyles, cardStyles, headerStyles, pageStyles } from '@/lib/styles'
import { useQuizStore } from '@/stores/quizStore'
import { CategoryTrendChart } from './CategoryTrendChart'
import { CertificateHistory } from './CertificateHistory'
import { LearningRecommendation } from './LearningRecommendation'
import { MasteryLevel } from './MasteryLevel'
import { SessionHistoryChart } from './SessionHistoryChart'
import { SessionHistoryList } from './SessionHistoryList'
import { WeakPointInsight } from './WeakPointInsight'

export function ProgressDashboard() {
  const {
    allQuestions,
    userProgress,
    getCategoryStats,
    setViewState,
    startSession,
    resetUserProgress,
    loadUserProgress,
    exportProgressCsv,
  } = useQuizStore()

  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [showCharts, setShowCharts] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [showDataManagement, setShowDataManagement] = useState(false)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  const showStatus = useCallback((message: string, duration = 3000) => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    setExportStatus(message)
    statusTimeoutRef.current = setTimeout(() => {
      setExportStatus(null)
      statusTimeoutRef.current = null
    }, duration)
  }, [])

  const categoryStats = getCategoryStats()
  const overallAccuracy = userProgress.getOverallAccuracy()
  const hasNoProgress = userProgress.totalAttempts === 0

  const handleExport = async () => {
    try {
      const progressRepo = getProgressRepository()
      const jsonData = await progressRepo.export()
      const result = await platformAPI.exportProgress(jsonData)
      if (result.success) showStatus('エクスポートしました')
      else if ('error' in result && result.error !== 'cancelled') showStatus(`エラー: ${result.error}`, 5000)
    } catch {
      showStatus('エクスポートに失敗しました', 5000)
    }
  }

  const handleImport = async () => {
    try {
      const result = await platformAPI.importProgress()
      if (result.success && result.data) {
        if (window.confirm('現在の学習履歴を上書きしますか？この操作は取り消せません。')) {
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
    <div className={`min-h-dvh ${pageStyles.cream}`}>
      {/* Sticky header */}
      <div className={`${headerStyles.sticky} px-4 py-3 sm:px-6`}>
        <div className="mx-auto flex items-center justify-between sm:max-w-2xl lg:max-w-4xl">
          <h1 className="text-lg font-bold text-claude-dark">学習進捗</h1>
          <button
            onClick={() => setViewState('menu')}
            className="tap-highlight rounded-full bg-stone-100 px-4 py-1.5 text-sm font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-300"
          >
            閉じる
          </button>
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 sm:px-6">
        <div className="mx-auto sm:max-w-2xl lg:max-w-4xl">
          {/* Empty State */}
          {hasNoProgress && (
            <div className={`mb-8 ${cardStyles.elevated} p-8 text-center`}>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-700">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-claude-dark">ここに学習の記録が残ります</h3>
              <p className="mb-4 text-sm text-stone-500">最初の1問を解くと、あなたの成長が見えるようになります</p>
              <button
                onClick={() => setViewState('menu')}
                className="tap-highlight rounded-2xl bg-claude-orange px-6 py-3 text-sm font-semibold text-white"
              >
                最初の1問を解く
              </button>
            </div>
          )}

          {/* Overall Stats — always visible */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="総回答数" value={userProgress.totalAttempts} icon="📝" />
            <StatCard label="正解数" value={userProgress.totalCorrect} icon="✅" />
            <StatCard label="正答率" value={`${overallAccuracy}%`} icon="📊" />
            <StatCard label="セッション数" value={`${userProgress.sessionHistory.length}回`} icon="📚" />
          </div>

          {/* AI Mastery Level — always visible */}
          {!hasNoProgress && (
            <MasteryLevel
              overallAccuracy={overallAccuracy}
              totalAttempts={userProgress.totalAttempts}
              categoryStats={categoryStats}
            />
          )}

          {/* Certificate History — always visible */}
          {!hasNoProgress && (
            <CertificateHistory
              sessionHistory={userProgress.sessionHistory}
              masteryIndex={getMasteryLevel(overallAccuracy, userProgress.totalAttempts, categoryStats).index}
            />
          )}

          {/* Learning Recommendation — always visible */}
          {!hasNoProgress && (
            <LearningRecommendation
              categoryStats={categoryStats}
              totalAttempts={userProgress.totalAttempts}
              onStartSession={startSession}
            />
          )}

          {/* Weak Point Insight — always visible */}
          {!hasNoProgress && (
            <WeakPointInsight
              allQuestions={allQuestions}
              userProgress={userProgress}
              categoryStats={categoryStats}
              onStartSession={startSession}
            />
          )}

          {/* Action button — always visible */}
          {!hasNoProgress && (
            <button
              onClick={() => startSession({ mode: 'weak' })}
              className="tap-highlight mb-4 w-full rounded-2xl bg-claude-orange px-6 py-3 font-semibold text-white"
            >
              🎯 苦手問題に挑戦
            </button>
          )}

          {/* ── Collapsible: Charts ── */}
          {!hasNoProgress && (
            <CollapsibleSection title="正答率の推移" isOpen={showCharts} onToggle={() => setShowCharts(!showCharts)}>
              <SessionHistoryChart sessions={userProgress.sessionHistory} />
              <div className="mt-4">
                <CategoryTrendChart sessions={userProgress.sessionHistory} />
              </div>
              {(() => {
                const trend = SessionInsightService.getImprovementTrend(userProgress.sessionHistory)
                const best = SessionInsightService.getBestScore(userProgress.sessionHistory)
                if (trend === null && best === null) return null
                return (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {best !== null && (
                      <div className={`flex-1 ${cardStyles.base} p-4`}>
                        <div className="mb-1 text-xs text-stone-500">最高正答率</div>
                        <div className="text-2xl font-bold text-claude-orange">{best}%</div>
                      </div>
                    )}
                    {trend !== null && (
                      <div className={`flex-1 ${cardStyles.base} p-4`}>
                        <div className="mb-1 text-xs text-stone-500">成長トレンド</div>
                        <div className={`text-2xl font-bold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {trend >= 0 ? '+' : ''}
                          {trend}%
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              {userProgress.sessionHistory.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-stone-500">最近のセッション</h3>
                  <SessionHistoryList sessions={userProgress.sessionHistory} limit={5} />
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* ── Collapsible: Category Details ── */}
          {!hasNoProgress && (
            <CollapsibleSection
              title="カテゴリ別進捗"
              isOpen={showCategories}
              onToggle={() => setShowCategories(!showCategories)}
            >
              {/* Teaching readiness */}
              {(() => {
                const teachable = PREDEFINED_CATEGORIES.filter((cat) => {
                  const stats = categoryStats[cat.id]
                  if (!stats || stats.attemptedQuestions < 5) return false
                  return Math.round((stats.correctAnswers / stats.attemptedQuestions) * 100) >= 90
                })
                if (teachable.length === 0) return null
                return (
                  <div className="mb-4 rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-500/30 dark:bg-purple-500/10">
                    <p className="mb-2 text-sm font-bold text-purple-700 dark:text-purple-300">🎓 教えられるカテゴリ</p>
                    <div className="flex flex-wrap gap-2">
                      {teachable.map((cat) => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                        >
                          {cat.icon} {cat.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
              <div className="space-y-3">
                {PREDEFINED_CATEGORIES.map((category: Category) => {
                  const stats = categoryStats[category.id]
                  const progress = stats
                    ? Math.round((stats.correctAnswers / Math.max(stats.attemptedQuestions, 1)) * 100)
                    : 0
                  const attempted = stats?.attemptedQuestions ?? 0
                  const total = stats?.totalQuestions ?? 0
                  return (
                    <div key={category.id} className={`${cardStyles.base} p-4`}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span className="font-medium text-claude-dark">{category.name}</span>
                          {progress >= 90 && <span className="text-xs">🏆</span>}
                          {progress >= 70 && progress < 90 && <span className="text-xs">⭐</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${progress >= 70 ? 'text-green-600' : progress >= 50 ? 'text-amber-600' : 'text-stone-500'}`}
                          >
                            {progress}%
                          </span>
                          <span className="text-xs text-stone-400">
                            {attempted}/{total}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                        <div
                          className="h-full rounded-full progress-gradient"
                          style={{
                            width: `${(attempted / Math.max(total, 1)) * 100}%`,
                            backgroundColor: getColorHex(category.color ?? 'gray'),
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* ── Collapsible: Data Management ── */}
          <CollapsibleSection
            title="データ管理"
            isOpen={showDataManagement}
            onToggle={() => setShowDataManagement(!showDataManagement)}
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={handleExport} className={`${buttonStyles.secondary} flex-1`}>
                  📥 履歴をエクスポート
                </button>
                <button onClick={handleImport} className={`${buttonStyles.secondary} flex-1`}>
                  📤 履歴をインポート
                </button>
              </div>
              <button
                onClick={async () => {
                  try {
                    await exportProgressCsv()
                    showStatus('CSVをエクスポートしました')
                  } catch {
                    showStatus('CSVエクスポートに失敗しました', 5000)
                  }
                }}
                className={`${buttonStyles.secondary} w-full`}
              >
                📊 CSVでエクスポート
              </button>
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
              <button
                onClick={async () => {
                  if (window.confirm('学習履歴をリセットしますか？この操作は取り消せません。')) {
                    await resetUserProgress()
                  }
                }}
                className="tap-highlight w-full rounded-2xl border border-red-600/50 px-6 py-3 font-semibold text-red-400"
              >
                履歴をリセット
              </button>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  )
}

/** Collapsible section with chevron toggle */
function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="tap-highlight mb-2 flex w-full items-center justify-between rounded-xl px-1 py-2 text-left"
      >
        <h2 className="text-sm font-semibold text-stone-500">{title}</h2>
        {isOpen ? <ChevronUp className="h-4 w-4 text-stone-400" /> : <ChevronDown className="h-4 w-4 text-stone-400" />}
      </button>
      {isOpen && <div className="animate-card-enter">{children}</div>}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className={`animate-card-enter ${cardStyles.elevated} p-3`}>
      <div className="mb-0.5 text-lg">{icon}</div>
      <div className="text-xl font-bold text-claude-dark">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  )
}
