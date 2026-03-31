import { ArrowRight, GraduationCap, Sparkles, TrendingUp } from 'lucide-react'
import { AppLogo } from '@/components/Layout/AppLogo'
import { getSubtitle, theme } from '@/config/theme'
import { hasSeenFlag, setSeenFlag } from '@/lib/storage'
import { useQuizStore } from '@/stores/quizStore'

const WELCOME_KEY = `${theme.storagePrefix}-welcomed`
const LEGACY_WELCOME_KEY = 'claude-quiz-welcomed'

interface WelcomeScreenProps {
  onComplete: () => void
}

// welcomeFeatures の各項目に対応するアイコン（項目数が多い場合は循環して使用）
const FEATURE_ICONS = [Sparkles, GraduationCap, TrendingUp] as const

/**
 * 初回起動時のウェルカム画面
 * localStorageで表示済みフラグを管理
 */
export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const questionCount = useQuizStore((s) => s.allQuestions.length)

  const handleStart = () => {
    setSeenFlag(WELCOME_KEY)
    onComplete()
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-claude-cream px-6">
      <div className="w-full max-w-sm animate-view-enter text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <AppLogo size={96} />
        </div>

        <h1 className="mb-2 text-3xl font-bold text-claude-dark sm:text-2xl">{theme.appName}</h1>
        <p className="mb-2 text-sm text-claude-gray">{theme.tagline}</p>
        <p className="mb-6 text-xs text-stone-500">{getSubtitle(questionCount)}</p>

        {/* Features */}
        <div className="mb-8 space-y-3 text-left">
          {theme.welcomeFeatures.map((feature, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]
            return (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm animate-feedback-section dark:bg-stone-800"
                style={{ animationDelay: `${(i + 1) * 150}ms` }}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-50">
                  <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-claude-dark">{feature.title}</p>
                  <p className="text-xs text-claude-gray">{feature.desc}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-claude-orange px-8 py-3.5 text-xl font-bold text-white shadow-lg"
        >
          <span>はじめる</span>
          <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-2 text-center text-xs text-stone-500">約5分</p>
      </div>
    </div>
  )
}

/**
 * ウェルカム画面の表示済み判定
 * レガシーキーもフォールバックで確認（テーマプレフィックス移行対応）
 */
export function hasSeenWelcome(): boolean {
  return hasSeenFlag(WELCOME_KEY) || hasSeenFlag(LEGACY_WELCOME_KEY)
}
