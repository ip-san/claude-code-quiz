import { BarChart3, Bookmark, BookOpen, HelpCircle, Menu, Moon, RefreshCw, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { KeyboardShortcutHelp } from '@/components/Layout/KeyboardShortcutHelp'
import { locale } from '@/config/locale'
import { theme } from '@/config/theme'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { haptics } from '@/lib/haptics'
import { isElectron } from '@/lib/platformAPI'
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from '@/lib/theme'
import { useQuizStore } from '@/stores/quizStore'
import { AnimatedCounter } from './AnimatedCounter'

interface MenuHeaderProps {
  totalQuestions: number
  answeredCount: number
  hasProgress: boolean
}

/**
 * メニュー画面のヘッダー
 * タイトル + ストリーク/ゴールバッジ + ハンバーガーメニュー
 */
export function MenuHeader({ totalQuestions, answeredCount, hasProgress }: MenuHeaderProps) {
  const { setViewState, userProgress, startSession, getBookmarkedCount } = useQuizStore()
  const bookmarkedCount = getBookmarkedCount()
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getStoredTheme())
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'checking' | 'latest' | 'error' | null>(null)

  const streak = userProgress.streakDays
  const today = DailyGoalService.getTodayString()
  const todayCount = userProgress.getDailyCount(today)
  const dailyGoal = userProgress.dailyGoal
  const goalProgress = Math.min(DailyGoalService.getProgress(todayCount, dailyGoal) * 100, 100)
  const goalAchieved = goalProgress >= 100

  const toggleTheme = () => {
    const next: Theme = currentTheme === 'dark' ? 'light' : 'dark'
    setStoredTheme(next)
    applyTheme(next)
    setCurrentTheme(next)
  }

  const handleMenuAction = (action: () => void) => {
    haptics.light()
    setMenuOpen(false)
    action()
  }

  return (
    <>
      <div className="mb-5">
        {/* Top row: hamburger + title + badges */}
        <div className="mb-2 flex items-center justify-between">
          {/* Left: hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="tap-highlight rounded-full p-2 text-stone-500"
            aria-label="メニューを開く"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Right: compact streak + goal badges */}
          <div className="flex items-center gap-2">
            {hasProgress && streak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                🔥 {streak}日
              </span>
            )}
            {hasProgress && (
              <div
                className="relative flex h-8 w-8 items-center justify-center"
                aria-label={`今日の目標 ${todayCount}/${dailyGoal}問`}
              >
                <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="text-stone-200 dark:text-stone-700"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r="13"
                    fill="none"
                    strokeWidth="2.5"
                    strokeDasharray={`${goalProgress * 0.817} 100`}
                    strokeLinecap="round"
                    className={goalAchieved ? 'text-green-500' : 'text-claude-orange'}
                    stroke="currentColor"
                  />
                </svg>
                <span className="absolute text-[9px] font-bold text-stone-500 dark:text-stone-400">
                  {goalAchieved ? '✓' : todayCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Title + subtitle */}
        <div className="text-center">
          <h1 className="mb-1 text-2xl font-bold">
            <span className="bg-gradient-to-r from-claude-orange to-orange-400 bg-clip-text text-transparent">
              {theme.appName}
            </span>
          </h1>
          <p className="text-sm text-claude-gray">
            {hasProgress ? (
              <>
                <AnimatedCounter target={totalQuestions} suffix="問" /> | {answeredCount}問 解答済み
              </>
            ) : (
              <>
                <AnimatedCounter target={totalQuestions} suffix="問" /> | {theme.categories.length}カテゴリ
              </>
            )}
          </p>
        </div>
      </div>

      {/* Slide-in menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="メニュー">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />

          {/* Menu panel */}
          <div className="relative z-10 flex h-full w-72 flex-col bg-claude-cream shadow-2xl animate-slide-in-left dark:bg-stone-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
              <span className="text-sm font-bold text-claude-dark dark:text-stone-200">{theme.appName}</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="tap-highlight rounded-full p-1.5 text-stone-400"
                aria-label="メニューを閉じる"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu items */}
            <nav className="flex-1 overflow-y-auto py-2">
              {/* Primary actions */}
              <div className="border-b border-stone-100 pb-2 dark:border-stone-800">
                <MenuItem
                  icon={<BookOpen className="h-4.5 w-4.5" />}
                  label={locale.reader.title}
                  sublabel={`${totalQuestions}問の${locale.reader.subtitle}`}
                  onClick={() => handleMenuAction(() => setViewState('reader'))}
                />
                {bookmarkedCount > 0 && (
                  <MenuItem
                    icon={<Bookmark className="h-4.5 w-4.5" />}
                    label="後で学ぶ"
                    sublabel={`${bookmarkedCount}問を保存中`}
                    onClick={() => handleMenuAction(() => startSession({ mode: 'bookmark' }))}
                  />
                )}
                {hasProgress && (
                  <MenuItem
                    icon={<BarChart3 className="h-4.5 w-4.5" />}
                    label={locale.progress.title}
                    sublabel="統計・推移・AI活用レベル"
                    onClick={() => handleMenuAction(() => setViewState('progress'))}
                  />
                )}
              </div>

              {/* Settings */}
              <div className="py-2">
                <MenuItem
                  icon={currentTheme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                  label={currentTheme === 'dark' ? 'ライトモード' : 'ダークモード'}
                  onClick={() => {
                    haptics.light()
                    toggleTheme()
                  }}
                />
                <div className="hidden sm:block">
                  <MenuItem
                    icon={<HelpCircle className="h-4.5 w-4.5" />}
                    label="キーボードショートカット"
                    onClick={() => handleMenuAction(() => setShowShortcuts(true))}
                  />
                </div>
                {!isElectron && (
                  <MenuItem
                    icon={<RefreshCw className={`h-4.5 w-4.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />}
                    label={
                      updateStatus === 'checking'
                        ? '確認中...'
                        : updateStatus === 'latest'
                          ? '✓ 最新版です'
                          : updateStatus === 'error'
                            ? '確認に失敗しました'
                            : '更新を確認'
                    }
                    onClick={async () => {
                      if (updateStatus === 'checking') return
                      haptics.light()
                      setUpdateStatus('checking')
                      try {
                        const reg = await navigator.serviceWorker?.getRegistration()
                        if (reg) {
                          await reg.update()
                          await new Promise((r) => setTimeout(r, 1000))
                          if (reg.waiting) {
                            window.location.reload()
                            return
                          }
                        }
                        setUpdateStatus('latest')
                        setTimeout(() => setUpdateStatus(null), 3000)
                      } catch {
                        setUpdateStatus('error')
                        setTimeout(() => setUpdateStatus(null), 3000)
                      }
                    }}
                  />
                )}
              </div>
            </nav>

            {/* Footer: streak info */}
            {hasProgress && streak > 0 && (
              <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-700">
                <p className="text-xs text-stone-400">
                  🔥 {streak}日連続学習 | 今日 {todayCount}/{dailyGoal}問
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <KeyboardShortcutHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </>
  )
}

function MenuItem({
  icon,
  label,
  sublabel,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="tap-highlight flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-claude-dark dark:text-stone-200"
    >
      <span className="text-stone-400">{icon}</span>
      <div className="flex-1">
        <span className="font-medium">{label}</span>
        {sublabel && <p className="text-xs text-stone-400">{sublabel}</p>}
      </div>
    </button>
  )
}
