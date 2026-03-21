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
    <div className="mb-5 animate-slide-down rounded-2xl border border-claude-orange/30 bg-gradient-to-r from-claude-orange/10 to-claude-orange/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">{modeIcon}</span>
        <div className="flex-1">
          <span className="text-sm font-semibold text-claude-dark">
            前回の続きがあります
          </span>
          <p className="text-xs text-stone-500">
            {modeName} - 問題 {progress}
            {scoreText && ` (${scoreText})`}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={resumeSession}
          className="tap-highlight inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-claude-orange px-4 py-3 text-base font-semibold text-white"
        >
          <PlayCircle className="h-5 w-5" />
          続きから再開
        </button>
        <button
          onClick={discardSavedSession}
          className="tap-highlight inline-flex items-center justify-center rounded-2xl border border-stone-300 px-4 py-3 text-stone-500"
          aria-label="保存されたセッションを破棄"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
