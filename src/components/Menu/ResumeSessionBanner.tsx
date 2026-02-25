import { useQuizStore } from '@/stores/quizStore'
import { getQuizModeById } from '@/domain/valueObjects/QuizMode'
import { PlayCircle, Trash2 } from 'lucide-react'

/**
 * 前回の途中セッションがある場合にメニュー画面に表示するバナー
 */
export function ResumeSessionBanner() {
  const { savedSession, resumeSession, discardSavedSession } = useQuizStore()

  if (!savedSession) return null

  const mode = getQuizModeById(savedSession.sessionConfig.mode)
  const modeName = mode?.name ?? savedSession.sessionConfig.mode
  const modeIcon = mode?.icon ?? '📋'
  const progress = `${savedSession.currentIndex + 1} / ${savedSession.questionIds.length}`
  const scoreText = savedSession.answeredCount > 0
    ? `${savedSession.score}/${savedSession.answeredCount}問正解`
    : ''

  return (
    <div className="mb-6 rounded-xl border border-claude-orange/30 bg-gradient-to-r from-claude-orange/10 to-claude-orange/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">{modeIcon}</span>
        <span className="text-sm font-semibold text-claude-dark">
          前回の続きがあります
        </span>
      </div>
      <p className="mb-3 text-xs text-stone-500">
        {modeName} - 問題 {progress}
        {scoreText && ` (${scoreText})`}
      </p>
      <div className="flex gap-2">
        <button
          onClick={resumeSession}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-claude-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-claude-orange/90"
        >
          <PlayCircle className="h-4 w-4" />
          続きから再開
        </button>
        <button
          onClick={discardSavedSession}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-50"
          aria-label="保存されたセッションを破棄"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
