import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Code2,
  FileText,
  MessageSquare,
  Shield,
  Terminal,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { theme } from '@/config/theme'
import { trackTutorial } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'

interface TutorialScreenProps {
  onComplete: () => void
}

interface TutorialSlide {
  icon: React.ReactNode
  title: string
  description: string
  visual: React.ReactNode
  tip?: string
}

const TUTORIAL_SLIDES: TutorialSlide[] = [
  {
    icon: <Terminal className="h-8 w-8 text-claude-orange" />,
    title: 'Claude Code って何？',
    description:
      'ターミナル（黒い画面）で動く AI アシスタントです。日本語で話しかけるだけで、コードを書いたり、ファイルを編集したり、コマンドを実行してくれます。',
    visual: (
      <div className="rounded-xl bg-stone-900 p-3 font-mono text-xs leading-relaxed">
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="ml-1.5 text-[10px] text-stone-500">Terminal</span>
        </div>
        <p className="text-stone-400">
          <span className="text-green-400">$</span> claude
        </p>
        <p className="mt-1.5 text-stone-300">
          <span className="text-blue-400">You:</span> このプロジェクトの構成を教えて
        </p>
        <p className="mt-1.5 text-stone-300">
          <span className="text-claude-orange">Claude:</span> React + TypeScript で構成されて
        </p>
        <p className="text-stone-300">います。主なディレクトリは...</p>
        <span className="animate-pulse text-claude-orange">|</span>
      </div>
    ),
    tip: 'プログラミング経験がなくても使えます',
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-blue-500" />,
    title: '日本語で指示するだけ',
    description:
      '難しいコマンドを覚える必要はありません。やりたいことを日本語で伝えるだけで、AI が最適な方法を考えて実行してくれます。',
    visual: (
      <div className="space-y-3">
        <ExampleBubble emoji="💬" text="ログイン機能を追加して" color="bg-blue-50 dark:bg-blue-900/30" />
        <ExampleBubble emoji="💬" text="このバグを直して" color="bg-green-50 dark:bg-green-900/30" />
        <ExampleBubble emoji="💬" text="テストを書いて" color="bg-purple-50 dark:bg-purple-900/30" />
        <ExampleBubble emoji="💬" text="コードをリファクタリングして" color="bg-amber-50 dark:bg-amber-900/30" />
      </div>
    ),
  },
  {
    icon: <Zap className="h-8 w-8 text-purple-500" />,
    title: 'AI ができること',
    description:
      'ファイルの読み書き、コード生成、バグ修正、テスト作成、ドキュメント生成など、開発作業の多くを AI がサポートしてくれます。',
    visual: (
      <div className="grid grid-cols-2 gap-2">
        <CapabilityCard icon={<Code2 className="h-5 w-5" />} label="コード生成" />
        <CapabilityCard icon={<FileText className="h-5 w-5" />} label="ファイル編集" />
        <CapabilityCard icon={<Terminal className="h-5 w-5" />} label="コマンド実行" />
        <CapabilityCard icon={<Shield className="h-5 w-5" />} label="安全性チェック" />
      </div>
    ),
    tip: '実行前に必ず確認があるので安心です',
  },
  {
    icon: (
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-claude-orange text-white">
        <span className="text-sm font-bold">{theme.logoText}</span>
      </div>
    ),
    title: 'このクイズで学べること',
    description:
      'Claude Code の基本操作から応用テクニックまで、クイズ形式で楽しく学べます。間違えても解説付きなので、確実に知識が身につきます。',
    visual: (
      <div className="space-y-2">
        <LearningPath step={1} label="基本操作を知る" desc="全体像モード 6チャプター" />
        <LearningPath step={2} label="知識を確認する" desc="カテゴリ別・ランダム問題" />
        <LearningPath step={3} label="実力を試す" desc="100問の実力テスト" />
      </div>
    ),
  },
]

function ExampleBubble({ emoji, text, color }: { emoji: string; text: string; color: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl ${color} px-4 py-2.5`}>
      <span>{emoji}</span>
      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{text}</span>
    </div>
  )
}

function CapabilityCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800">
      <div className="text-claude-orange">{icon}</div>
      <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{label}</span>
    </div>
  )
}

function LearningPath({ step, label, desc }: { step: number; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-claude-orange/10 text-sm font-bold text-claude-orange">
        {step}
      </div>
      <div>
        <p className="text-sm font-semibold text-claude-dark dark:text-stone-200">{label}</p>
        <p className="text-xs text-stone-400">{desc}</p>
      </div>
    </div>
  )
}

/**
 * Claude Code 紹介チュートリアル
 *
 * ウェルカム画面の後、初回ユーザー向けに表示。
 * スワイプ or ボタンで4画面を進む形式。
 */
export function TutorialScreen({ onComplete }: TutorialScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slide = TUTORIAL_SLIDES[currentSlide]
  const isLast = currentSlide === TUTORIAL_SLIDES.length - 1

  const goNext = () => {
    haptics.light()
    if (isLast) {
      trackTutorial('complete')
      onComplete()
    } else {
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const goPrev = () => {
    haptics.light()
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-claude-cream dark:bg-stone-900">
      {/* Skip button */}
      <div className="flex justify-end px-4 pt-4">
        <button
          onClick={() => {
            haptics.light()
            trackTutorial('skip', currentSlide)
            onComplete()
          }}
          className="tap-highlight flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        >
          スキップ
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Slide content */}
      <div className="flex flex-1 flex-col justify-center px-6" key={currentSlide} aria-live="polite">
        <div className="mx-auto w-full max-w-sm animate-view-enter">
          {/* Icon */}
          <div className="mb-3 flex justify-center">{slide.icon}</div>

          {/* Title & description */}
          <h2 className="mb-1.5 text-center text-xl font-bold text-claude-dark dark:text-stone-100">{slide.title}</h2>
          <p className="mb-4 text-center text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {slide.description}
          </p>

          {/* Visual */}
          <div className="mb-3">{slide.visual}</div>

          {/* Tip */}
          {slide.tip && <p className="text-center text-xs text-stone-400 dark:text-stone-500">💡 {slide.tip}</p>}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="px-6 pb-6">
        <div className="mx-auto w-full max-w-sm">
          {/* Progress dots */}
          <div className="mb-4 flex justify-center gap-2">
            {TUTORIAL_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  haptics.light()
                  setCurrentSlide(i)
                }}
                className={`h-2 rounded-full transition-all ${
                  i === currentSlide ? 'w-6 bg-claude-orange' : 'w-2 bg-stone-300 dark:bg-stone-600'
                }`}
                aria-label={`スライド ${i + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentSlide === 0}
              className={`tap-highlight flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                currentSlide === 0
                  ? 'border-stone-200 text-stone-300 dark:border-stone-700 dark:text-stone-600'
                  : 'border-stone-300 text-stone-600 dark:border-stone-600 dark:text-stone-300'
              }`}
              aria-label="前へ"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              className="tap-highlight flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-claude-orange text-base font-semibold text-white shadow-md"
            >
              {isLast ? 'クイズを始める' : '次へ'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const TUTORIAL_KEY = `${theme.storagePrefix}-tutorial-seen`

export function hasSeenTutorial(): boolean {
  try {
    if (localStorage.getItem(TUTORIAL_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  try {
    if (sessionStorage.getItem(TUTORIAL_KEY) === '1') return true
  } catch {
    /* ignore */
  }
  return false
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1')
  } catch {
    try {
      sessionStorage.setItem(TUTORIAL_KEY, '1')
    } catch {
      /* ignore */
    }
  }
}
