import { useQuizStore } from '@/stores/quizStore'
import { Trophy, RotateCcw, Star, Home } from 'lucide-react'
import { APP_CONFIG } from '@/config/quizConfig'

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
  const { score, answeredCount, endSession, startSession, sessionConfig } =
    useQuizStore()

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
        color: 'text-yellow-400',
        bgColor: 'from-yellow-500/20 to-yellow-600/20',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.EXCELLENT) {
      return {
        title: '合格！優秀です',
        message: '高い正答率です。あと少しで完璧！',
        color: 'text-green-400',
        bgColor: 'from-green-500/20 to-green-600/20',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.PASSING) {
      return {
        title: '合格！',
        message: '合格ラインをクリアしました。復習で更に伸ばしましょう。',
        color: 'text-blue-400',
        bgColor: 'from-blue-500/20 to-blue-600/20',
      }
    }
    if (percentage >= SCORE_THRESHOLDS.ALMOST) {
      return {
        title: 'もう少し！',
        message: '合格まであと少しです。苦手な分野を復習しましょう。',
        color: 'text-orange-400',
        bgColor: 'from-orange-500/20 to-orange-600/20',
      }
    }
    return {
      title: '頑張りましょう！',
      message: '間違えた問題を見直して、再チャレンジしてみてください。',
      color: 'text-red-400',
      bgColor: 'from-red-500/20 to-red-600/20',
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
        className={`w-full max-w-md rounded-2xl border border-slate-700 bg-gradient-to-br ${result.bgColor} p-8 text-center shadow-xl`}
      >
        {/* Trophy icon */}
        <div
          className={`mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${
            isPassing
              ? 'from-yellow-500/30 to-yellow-600/30'
              : 'from-slate-600/30 to-slate-700/30'
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
          <span className="text-5xl font-bold text-white">{score}</span>
          <span className="text-2xl text-slate-400"> / {answeredCount}</span>
        </div>

        {/* Percentage */}
        <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-slate-700/50 px-3 py-1">
          <span className={`text-lg font-semibold ${result.color}`}>
            {percentage}%
          </span>
        </div>

        {/* Pass/Fail indicator */}
        <div className="mb-4">
          <span
            className={`rounded-full px-4 py-1 text-sm font-medium ${
              isPassing
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isPassing ? '✓ 合格' : '✗ 不合格'} (合格ライン:{' '}
            {APP_CONFIG.passingScore}%)
          </span>
        </div>

        {/* Message */}
        <p className="mb-8 text-slate-400">{result.message}</p>

        {/* Stars visualization */}
        <div className="mb-8 flex justify-center gap-1" role="img" aria-label={`${Math.ceil(percentage / STAR_PERCENTAGE_DIVISOR)}つ星の評価`}>
          {[...Array(STAR_COUNT)].map((_, i) => (
            <Star
              key={i}
              className={`h-8 w-8 ${
                i < Math.ceil(percentage / STAR_PERCENTAGE_DIVISOR)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-600'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
          >
            <RotateCcw className="h-5 w-5" />
            もう一度挑戦する
          </button>
          <button
            onClick={handleBackToMenu}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 px-6 py-3 font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            <Home className="h-5 w-5" />
            メニューに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
