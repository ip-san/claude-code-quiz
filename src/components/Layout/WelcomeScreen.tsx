import { BookOpen, Target, BarChart3, ArrowRight } from 'lucide-react'

const WELCOME_KEY = 'claude-quiz-welcomed'

interface WelcomeScreenProps {
  onComplete: () => void
}

const FEATURES = [
  {
    icon: <BookOpen className="h-6 w-6 text-claude-orange" />,
    title: '630問のクイズ',
    desc: 'Claude Code の全機能を網羅した問題集',
  },
  {
    icon: <Target className="h-6 w-6 text-blue-500" />,
    title: '学習モード',
    desc: 'カテゴリ別・難易度別に効率よく学習',
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-green-500" />,
    title: '学習履歴',
    desc: '進捗を記録し、苦手分野を把握',
  },
] as const

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
      try { sessionStorage.setItem(WELCOME_KEY, '1') } catch { /* ignore */ }
    }
    onComplete()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-claude-cream px-6">
      <div className="w-full max-w-sm animate-view-enter text-center">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-claude-orange shadow-lg">
          <span className="text-4xl font-bold text-white">CC</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-claude-dark">
          Claude Code Quiz へようこそ
        </h1>
        <p className="mb-8 text-sm text-claude-gray">
          Claude Code の機能と使い方をクイズで学びましょう
        </p>

        {/* Features */}
        <div className="mb-8 space-y-3 text-left">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm animate-feedback-section"
              style={{ animationDelay: `${(i + 1) * 150}ms` }}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-50">
                {feature.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-claude-dark">{feature.title}</p>
                <p className="text-xs text-claude-gray">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-claude-orange px-8 py-4 text-lg font-semibold text-white shadow-lg"
        >
          はじめる
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

/** Check if user has seen the welcome screen */
export function hasSeenWelcome(): boolean {
  try {
    if (localStorage.getItem(WELCOME_KEY) === '1') return true
  } catch { /* ignore */ }
  try {
    if (sessionStorage.getItem(WELCOME_KEY) === '1') return true
  } catch { /* ignore */ }
  return false
}
