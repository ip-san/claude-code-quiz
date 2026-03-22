import { useMemo } from 'react'
import { PREDEFINED_CATEGORIES } from '@/domain/valueObjects/Category'

/**
 * 5段階のAI活用レベル定義
 *
 * 🌱 AI入門者: 学習を始めたばかり
 * 📚 AI学習者: 正答率50%以上
 * 🚀 AI実践者: 正答率70%以上
 * ⚡ AI推進者: 正答率80%以上 + 半数以上の問題を学習
 * 👑 AI牽引役: 正答率85%以上 + 全カテゴリ70%習得（7/8以上）
 */
const MASTERY_LEVELS = [
  { name: 'AI入門者', icon: '🌱', color: 'text-claude-orange', bg: 'bg-claude-orange/10', req: null },
  { name: 'AI学習者', icon: '📚', color: 'text-blue-600', bg: 'bg-blue-500/10', req: '正答率50%以上' },
  { name: 'AI実践者', icon: '🚀', color: 'text-green-600', bg: 'bg-green-500/10', req: '正答率70%以上' },
  { name: 'AI推進者', icon: '⚡', color: 'text-purple-600', bg: 'bg-purple-500/10', req: '正答率80% + 半数以上学習' },
  { name: 'AI牽引役', icon: '👑', color: 'text-yellow-600', bg: 'bg-yellow-500/10', req: '正答率85% + 全カテゴリ習得' },
] as const

/** 正答率・網羅率・カテゴリ習得数から現在のレベルを判定 */
function calculateLevelIndex(accuracy: number, answeredRatio: number, masteredCount: number): number {
  if (accuracy >= 85 && masteredCount >= 7) return 4
  if (accuracy >= 80 && answeredRatio >= 0.5) return 3
  if (accuracy >= 70) return 2
  if (accuracy >= 50) return 1
  return 0
}

/** 次のレベルに向けた進捗率（0〜100）を計算 */
function calculateProgressToNext(
  levelIndex: number,
  accuracy: number,
  answeredRatio: number,
  masteredCount: number,
): number {
  switch (levelIndex) {
    case 0: return Math.min((accuracy / 50) * 100, 100)
    case 1: return Math.min((accuracy / 70) * 100, 100)
    // 推進者: 正答率50% + 網羅率50% の複合
    case 2: return Math.min((accuracy / 80) * 50 + answeredRatio * 50, 100)
    // 牽引役: 正答率50% + カテゴリ習得率50% の複合
    case 3: return Math.min((accuracy / 85) * 50 + (masteredCount / 7) * 50, 100)
    default: return 100
  }
}

interface MasteryRoadmapProps {
  totalCorrect: number
  totalAttempts: number
  totalQuestions: number
  unansweredCount: number
  categoryStats: Record<string, { correctAnswers: number; attemptedQuestions: number }>
}

/**
 * AI活用レベルロードマップ
 * 現在のレベルと次のレベルへの進捗を表示し、上を目指す動機を作る
 */
export function MasteryRoadmap({
  totalCorrect,
  totalAttempts,
  totalQuestions,
  unansweredCount,
  categoryStats,
}: MasteryRoadmapProps) {
  const { current, next, nextProgress, stats } = useMemo(() => {
    const answered = totalQuestions - unansweredCount
    const answeredRatio = totalQuestions > 0 ? answered / totalQuestions : 0
    const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

    // 正答率70%以上のカテゴリ数
    const masteredCategories = PREDEFINED_CATEGORIES.filter(cat => {
      const s = categoryStats[cat.id]
      if (!s || s.attemptedQuestions === 0) return false
      return Math.round((s.correctAnswers / s.attemptedQuestions) * 100) >= 70
    }).length

    const levelIdx = calculateLevelIndex(overallAccuracy, answeredRatio, masteredCategories)
    const currentLevel = MASTERY_LEVELS[levelIdx]
    const nextLevel = levelIdx < MASTERY_LEVELS.length - 1 ? MASTERY_LEVELS[levelIdx + 1] : null
    const progress = nextLevel
      ? calculateProgressToNext(levelIdx, overallAccuracy, answeredRatio, masteredCategories)
      : 100

    return {
      current: currentLevel,
      next: nextLevel,
      nextProgress: Math.round(progress),
      stats: { overallAccuracy, answered, masteredCategories },
    }
  }, [totalCorrect, totalAttempts, totalQuestions, unansweredCount, categoryStats])

  return (
    <div className={`mb-4 rounded-2xl ${current.bg} p-4 shadow-sm`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{current.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-bold ${current.color}`}>{current.name}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            正答率 {stats.overallAccuracy}% · {stats.answered}/{totalQuestions}問 · {stats.masteredCategories}/8カテゴリ習得
          </p>
        </div>
      </div>
      {next && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-stone-400">次: {next.icon} {next.name}</span>
            <span className="text-stone-400 dark:text-stone-300">{next.req}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={nextProgress} aria-valuemin={0} aria-valuemax={100} aria-label="次のレベルへの進捗">
            <div
              className="h-full rounded-full progress-gradient transition-all"
              style={{ width: `${nextProgress}%` }}
            />
          </div>
        </div>
      )}
      {!next && (
        <p className="mt-2 text-center text-xs font-medium text-yellow-700 dark:text-yellow-300">
          最高レベル到達。あなたはチームのAI駆動開発を牽引できます。
        </p>
      )}
    </div>
  )
}
