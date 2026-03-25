import { useState } from 'react'
import { BarChart3, HelpCircle, Moon, Sun } from 'lucide-react'
import { useQuizStore } from '@/stores/quizStore'
import { getStoredTheme, setStoredTheme, applyTheme, type Theme } from '@/lib/theme'
import { AnimatedCounter } from './AnimatedCounter'
import { KeyboardShortcutHelp } from '@/components/Layout/KeyboardShortcutHelp'
import { theme } from '@/config/theme'

interface MenuHeaderProps {
  totalQuestions: number
  answeredCount: number
  hasProgress: boolean
}

/**
 * メニュー画面のヘッダー
 * タイトル + 学習履歴・ショートカット・テーマ切替アイコン
 */
export function MenuHeader({ totalQuestions, answeredCount, hasProgress }: MenuHeaderProps) {
  const { setViewState } = useQuizStore()
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getStoredTheme())
  const [showShortcuts, setShowShortcuts] = useState(false)

  return (
    <>
      <div className="mb-5 text-center">
        <div className="mb-2 flex items-center justify-end gap-1">
          {hasProgress && (
            <button
              onClick={() => setViewState('progress')}
              className="tap-highlight rounded-full p-2 text-stone-500"
              aria-label="学習履歴"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => setShowShortcuts(true)}
            className="tap-highlight hidden rounded-full p-2 text-stone-500 sm:block"
            aria-label="キーボードショートカット"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              const next: Theme = currentTheme === 'dark' ? 'light' : 'dark'
              setStoredTheme(next)
              applyTheme(next)
              setCurrentTheme(next)
            }}
            className="tap-highlight rounded-full p-2 text-stone-500"
            aria-label="テーマ切替"
          >
            {currentTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        <h1 className="mb-1 text-2xl font-bold">
          <span className="bg-gradient-to-r from-claude-orange to-orange-400 bg-clip-text text-transparent">
            {theme.appName}
          </span>
        </h1>
        <p className="text-sm text-claude-gray">
          {hasProgress ? (
            <>
              <AnimatedCounter target={totalQuestions} suffix="問" /> |{' '}
              {answeredCount}問 解答済み
            </>
          ) : (
            <>
              <AnimatedCounter target={totalQuestions} suffix="問" /> | {theme.categories.length}カテゴリ
            </>
          )}
        </p>
      </div>
      <KeyboardShortcutHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  )
}
