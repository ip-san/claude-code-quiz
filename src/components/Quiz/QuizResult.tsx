import { useQuizStore, APP_CONFIG } from '@/stores/quizStore'
import { Trophy, RotateCcw, Star, Home } from 'lucide-react'

// Score thresholds for result messages
const SCORE_THRESHOLDS = {
  PERFECT: 100,
  EXCELLENT: 80,
  PASSING: 70,
  ALMOST: 50,
} as const

// Star visualization constants
const STAR_COUNT = 5
const STAR_PERCENTAGE_DIVISOR = 20

export function QuizResult() {
  const { sessionState, endSession, startSession, sessionConfig } = useQuizStore()

  const score = sessionState?.score ?? 0
  const answeredCount = sessionState?.answeredCount ?? 0

  // Prevent NaN when no questions answered (edge case: timer expired immediately)
  const percentage = answeredCount > 0
    ? Math.round((score / answeredCount) * 100)
    : 0
  const isPassing = percentage >= APP_CONFIG.passingScore

  const getMessage = () => {
    if (percentage === SCORE_THRESHOLDS.PERFECT) {
      return {
        title: 'パーフェクト！',
        message: '全問正解です。素晴らしい理解度です！',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.EXCELLENT) {
      return {
        title: '合格！優秀です',
        message: '高い正答率です。あと少しで完璧！',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.PASSING) {
      return {
        title: '合格！',
        message: '合格ラインをクリアしました。復習で更に伸ばしましょう。',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.ALMOST) {
      return {
        title: 'もう少し！',
        message: '合格まであと少しです。苦手な分野を復習しましょう。',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
      }
    }
    return {
      title: '頑張りましょう！',
      message: '間違えた問題を見直して、再チャレンジしてみてください。',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    }
  }

  const result = getMessage()

  const handleRetry = () => {
    startSession(sessionConfig)
  }

  const handleBackToMenu = () => {
    endSession()
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div
        className={`w-full max-w-md rounded-2xl border ${result.borderColor} ${result.bgColor} p-8 text-center shadow-lg`}
      >
        {/* Trophy icon */}
        <div
          className={`mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full ${
            isPassing
              ? 'bg-yellow-100'
              : 'bg-stone-100'
          }`}
        >
          <Trophy className={`h-10 w-10 ${result.color}`} />
        </div>

        {/* Title */}
        <h2 className={`mb-2 text-2xl font-bold ${result.color}`}>
          {result.title}
        </h2>

        {/* Score display */}
        <div className="mb-4">
          <span className="text-5xl font-bold text-claude-dark">{score}</span>
          <span className="text-2xl text-stone-400"> / {answeredCount}</span>
        </div>

        {/* Percentage */}
        <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
          <span className={`text-lg font-semibold ${result.color}`}>
            {percentage}%
          </span>
        </div>

        {/* Pass/Fail indicator */}
        <div className="mb-4">
          <span
            className={`rounded-full px-4 py-1 text-sm font-medium ${
              isPassing
                ? 'bg-green-100 text-green-600'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {isPassing ? '✓ 合格' : '✗ 不合格'} (合格ライン:{' '}
            {APP_CONFIG.passingScore}%)
          </span>
        </div>

        {/* Message */}
        <p className="mb-8 text-stone-500">{result.message}</p>

        {/* Stars visualization */}
        <div className="mb-8 flex justify-center gap-1" role="img" aria-label={`${Math.ceil(percentage / STAR_PERCENTAGE_DIVISOR)}つ星の評価`}>
          {[...Array(STAR_COUNT)].map((_, i) => (
            <Star
              key={i}
              className={`h-8 w-8 ${
                i < Math.ceil(percentage / STAR_PERCENTAGE_DIVISOR)
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'text-stone-300'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-claude-orange px-6 py-3 font-medium text-white transition-colors hover:bg-claude-orange/90"
          >
            <RotateCcw className="h-5 w-5" />
            もう一度挑戦する
          </button>
          <button
            onClick={handleBackToMenu}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-6 py-3 font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            <Home className="h-5 w-5" />
            メニューに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
