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
import { AppLogo } from '@/components/Layout/AppLogo'
import { theme } from '@/config/theme'
import { trackTutorial } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { hasSeenFlag, setSeenFlag } from '@/lib/storage'

interface TutorialScreenProps {
  onComplete: () => void
}

interface SlideData {
  iconType: 'terminal' | 'message' | 'zap' | 'logo'
  title: string
  description: string
  visualType: 'terminal' | 'bubbles' | 'capabilities' | 'path'
  tip?: string
}

const SLIDE_DATA: SlideData[] = [
  {
    iconType: 'terminal',
    title: 'Claude Code って何？',
    description:
      'ターミナル（黒い画面）で動く AI アシスタントです。日本語で話しかけるだけで、コードを書いたり、ファイルを編集したり、コマンドを実行してくれます。',
    visualType: 'terminal',
    tip: 'プログラミング経験がなくても使えます',
  },
  {
    iconType: 'message',
    title: '日本語で指示するだけ',
    description:
      '難しいコマンドを覚える必要はありません。やりたいことを日本語で伝えるだけで、AI が最適な方法を考えて実行してくれます。',
    visualType: 'bubbles',
  },
  {
    iconType: 'zap',
    title: 'AI ができること',
    description:
      'ファイルの読み書き、コード生成、バグ修正、テスト作成、ドキュメント生成など、開発作業の多くを AI がサポートしてくれます。',
    visualType: 'capabilities',
    tip: '実行前に必ず確認があるので安心です',
  },
  {
    iconType: 'logo',
    title: 'このクイズで学べること',
    description:
      'Claude Code の基本操作から応用テクニックまで、クイズ形式で楽しく学べます。間違えても解説付きなので、確実に知識が身につきます。',
    visualType: 'path',
  },
]

function SlideIcon({ type }: { type: SlideData['iconType'] }) {
  switch (type) {
    case 'terminal':
      return <Terminal className="h-8 w-8 text-claude-orange" />
    case 'message':
      return <MessageSquare className="h-8 w-8 text-blue-500" />
    case 'zap':
      return <Zap className="h-8 w-8 text-purple-500" />
    case 'logo':
      return <AppLogo size={32} />
  }
}

function SlideVisual({ type }: { type: SlideData['visualType'] }) {
  switch (type) {
    case 'terminal':
      return (
        <div className="rounded-xl bg-stone-900 p-4 font-mono text-sm">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-stone-500">Terminal</span>
          </div>
          <p className="text-stone-400">
            <span className="text-green-400">$</span> claude
          </p>
          <p className="mt-2 text-stone-300">
            <span className="text-blue-400">あなた:</span> このプロジェクトの構成を教えて
          </p>
          <p className="mt-2 text-stone-300">
            <span className="text-claude-orange">Claude:</span> このプロジェクトは React + TypeScript で
          </p>
          <p className="text-stone-300">構成されています。主なディレクトリは...</p>
          <span className="animate-pulse text-claude-orange">|</span>
        </div>
      )
    case 'bubbles':
      return (
        <div className="space-y-3">
          {[
            { text: 'ログイン機能を追加して', color: 'bg-blue-50 dark:bg-blue-900/30' },
            { text: 'このバグを直して', color: 'bg-green-50 dark:bg-green-900/30' },
            { text: 'テストを書いて', color: 'bg-purple-50 dark:bg-purple-900/30' },
            { text: 'コードをリファクタリングして', color: 'bg-amber-50 dark:bg-amber-900/30' },
          ].map((item) => (
            <div key={item.text} className={`flex items-center gap-2 rounded-xl ${item.color} px-4 py-2.5`}>
              <span>💬</span>
              <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{item.text}</span>
            </div>
          ))}
        </div>
      )
    case 'capabilities':
      return (
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <Code2 className="h-5 w-5" />, label: 'コード生成' },
            { icon: <FileText className="h-5 w-5" />, label: 'ファイル編集' },
            { icon: <Terminal className="h-5 w-5" />, label: 'コマンド実行' },
            { icon: <Shield className="h-5 w-5" />, label: '安全性チェック' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800"
            >
              <div className="text-claude-orange">{item.icon}</div>
              <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{item.label}</span>
            </div>
          ))}
        </div>
      )
    case 'path':
      return (
        <div className="space-y-2">
          {[
            { step: 1, label: '基本操作を知る', desc: '全体像モード 6チャプター' },
            { step: 2, label: '知識を確認する', desc: 'カテゴリ別・ランダム問題' },
            { step: 3, label: '実力を試す', desc: '100問の実力テスト' },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-stone-800"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-claude-orange/10 text-sm font-bold text-claude-orange">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-claude-dark dark:text-stone-200">{item.label}</p>
                <p className="text-xs text-stone-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )
  }
}

/**
 * Claude Code 紹介チュートリアル
 *
 * ウェルカム画面の後、初回ユーザー向けに表示。
 * スワイプ or ボタンで4画面を進む形式。
 */
export function TutorialScreen({ onComplete }: TutorialScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slide = SLIDE_DATA[currentSlide]
  const isLast = currentSlide === SLIDE_DATA.length - 1

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
    <div className="grid min-h-dvh grid-rows-[auto_1fr_auto] bg-claude-cream dark:bg-stone-900">
      {/* Skip button */}
      <div className="flex justify-end px-4 pt-3">
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

      {/* Slide content — fills remaining space, content centered */}
      <div className="flex items-center px-6" key={currentSlide} aria-live="polite">
        <div className="mx-auto w-full max-w-sm animate-view-enter">
          <div className="mb-2 flex justify-center">
            <SlideIcon type={slide.iconType} />
          </div>
          <h2 className="mb-1 text-center text-lg font-bold text-claude-dark dark:text-stone-100">{slide.title}</h2>
          <p className="mb-3 text-center text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            {slide.description}
          </p>
          <div className="mb-2">
            <SlideVisual type={slide.visualType} />
          </div>
          {slide.tip && <p className="text-center text-xs text-stone-400 dark:text-stone-500">💡 {slide.tip}</p>}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="px-6 pb-6">
        <div className="mx-auto w-full max-w-sm">
          {/* Progress dots */}
          <div className="mb-4 flex justify-center gap-2">
            {SLIDE_DATA.map((_, i) => (
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
              {isLast ? 'はじめる' : '次へ'}
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
  return hasSeenFlag(TUTORIAL_KEY)
}

export function markTutorialSeen(): void {
  setSeenFlag(TUTORIAL_KEY)
}
