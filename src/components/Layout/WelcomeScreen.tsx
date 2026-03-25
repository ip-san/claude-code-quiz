import { ArrowRight, GraduationCap, Sparkles, TrendingUp } from 'lucide-react'
import { theme } from '@/config/theme'

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
  const handleStart = () => {
    try {
      localStorage.setItem(WELCOME_KEY, '1')
    } catch {
      // private browsing — use sessionStorage as fallback
      try {
        sessionStorage.setItem(WELCOME_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    onComplete()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-claude-cream px-6">
      <div className="w-full max-w-sm animate-view-enter text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-claude-orange shadow-lg">
          <span className="text-4xl font-bold text-white">{theme.logoText}</span>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-claude-dark sm:text-2xl">{theme.appName}</h1>
        <p className="mb-2 text-sm text-claude-gray">{theme.tagline}</p>
        <p className="mb-6 text-xs text-stone-400">{theme.subtitle}</p>

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
          className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-claude-orange px-8 py-3.5 text-lg font-semibold text-white shadow-lg"
        >
          <span>はじめる</span>
          <span className="text-xs opacity-75">約5分</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

/**
 * ウェルカム画面の表示済み判定
 * localStorage → sessionStorage の順で確認（プライベートブラウジング対応）
 * レガシーキーもフォールバックで確認（テーマプレフィックス移行対応）
 */
export function hasSeenWelcome(): boolean {
  const keys = [WELCOME_KEY, LEGACY_WELCOME_KEY]
  try {
    if (keys.some((k) => localStorage.getItem(k) === '1')) return true
  } catch {
    /* localStorage が使えない環境 */
  }
  try {
    if (keys.some((k) => sessionStorage.getItem(k) === '1')) return true
  } catch {
    /* sessionStorage も使えない環境 */
  }
  return false
}
