import {
  BarChart3,
  Bookmark,
  BookOpen,
  BookOpenCheck,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  HelpCircle,
  Layers,
  List,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { KeyboardShortcutHelp } from '@/components/Layout/KeyboardShortcutHelp'
import { locale } from '@/config/locale'
import { theme } from '@/config/theme'
import { DailyGoalService } from '@/domain/services/DailyGoalService'
import { PREDEFINED_QUIZ_MODES } from '@/domain/valueObjects/QuizMode'
import { haptics } from '@/lib/haptics'
import { isElectron } from '@/lib/platformAPI'
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from '@/lib/theme'
import { useQuizStore } from '@/stores/quizStore'
import { AnimatedCounter } from './AnimatedCounter'
import { CategoryPicker } from './CategoryPicker'
import { MenuItem } from './MenuItem'

interface MenuHeaderProps {
  totalQuestions: number
  answeredCount: number
  hasProgress: boolean
  /** 外部からメニューを開く（クイズモード展開状態で） */
  openWithModes?: boolean
  onMenuOpened?: () => void
}

/**
 * メニュー画面のヘッダー
 * タイトル + ストリーク/ゴールバッジ + ハンバーガーメニュー
 */
export function MenuHeader({
  totalQuestions,
  answeredCount,
  hasProgress,
  openWithModes,
  onMenuOpened,
}: MenuHeaderProps) {
  const { setViewState, openReaderWithFilter, userProgress, startSession, getBookmarkedCount } = useQuizStore()
  const bookmarkedCount = getBookmarkedCount()
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => getStoredTheme())
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [modesExpanded, setModesExpanded] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<'checking' | 'latest' | 'error' | null>(null)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showUnansweredPicker, setShowUnansweredPicker] = useState(false)

  // 外部からメニューを開く（クイズモード展開状態）
  useEffect(() => {
    if (openWithModes) {
      setMenuOpen(true)
      setModesExpanded(true)
      onMenuOpened?.()
    }
  }, [openWithModes, onMenuOpened])

  // Escape キーでメニューを閉じる
  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

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

  const handleUpdateCheck = async () => {
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
  }

  return (
    <>
      {/* Header bar */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => {
              setModesExpanded(false)
              setMenuOpen(true)
            }}
            className="tap-highlight rounded-full p-2 text-stone-500"
            aria-label={locale.menuHeader.openMenu}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            {hasProgress && streak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                {locale.menuHeader.streakBadge(streak)}
              </span>
            )}
            {hasProgress && (
              <DailyGoalRing progress={goalProgress} achieved={goalAchieved} count={todayCount} goal={dailyGoal} />
            )}
          </div>
        </div>
        <div className="text-center">
          <h1 className="mb-1 text-2xl font-bold">
            <span className="bg-gradient-to-r from-claude-orange to-orange-400 bg-clip-text text-transparent">
              {theme.appName}
            </span>
          </h1>
          <p className="text-sm text-claude-gray">
            {hasProgress ? (
              <>
                <AnimatedCounter target={totalQuestions} suffix={locale.common.questionSuffix} /> | {answeredCount}
                {locale.menu.answered}
              </>
            ) : (
              <>
                <AnimatedCounter target={totalQuestions} suffix={locale.common.questionSuffix} /> |{' '}
                {theme.categories.length}
                {locale.common.categorySuffix}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Slide-in menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={locale.menuHeader.menuLabel}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setMenuOpen(false)
            }}
            role="presentation"
          />
          <div className="relative z-10 flex h-full w-72 flex-col bg-claude-cream shadow-2xl animate-slide-in-left dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
              <span className="text-sm font-bold text-claude-dark dark:text-stone-200">{theme.appName}</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="tap-highlight rounded-full p-1.5 text-stone-400"
                aria-label={locale.menuHeader.closeMenu}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2">
              {/* About */}
              <MenuSection>
                <MenuItem
                  icon={<GraduationCap className="h-4.5 w-4.5" />}
                  label={locale.menuHeader.aboutClaude}
                  sublabel={locale.menuHeader.aboutClaudeDesc}
                  onClick={() => handleMenuAction(() => setViewState('tutorial'))}
                />
              </MenuSection>

              {/* Quiz modes */}
              <MenuSection title="学習">
                <button
                  onClick={() => setModesExpanded(!modesExpanded)}
                  className="tap-highlight flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-claude-dark dark:text-stone-200"
                >
                  <span className="text-stone-400">🎮</span>
                  <span className="flex-1 font-medium">{locale.menuHeader.quizModes}</span>
                  {modesExpanded ? (
                    <ChevronUp className="h-4 w-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-stone-400" />
                  )}
                </button>
                {modesExpanded && (
                  <div className="pb-1">
                    {PREDEFINED_QUIZ_MODES.filter(
                      (m) => m.id !== 'review' && m.id !== 'bookmark' && m.id !== 'scenario' && m.id !== 'quick'
                    ).map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          if (mode.id === 'category') {
                            haptics.light()
                            setMenuOpen(false)
                            setShowCategoryPicker(true)
                          } else {
                            handleMenuAction(() => startSession({ mode: mode.id }))
                          }
                        }}
                        className="tap-highlight flex w-full items-center gap-3 px-4 py-2.5 pl-11 text-left"
                      >
                        <span className="text-sm">{mode.icon}</span>
                        <div className="flex-1">
                          <span className="text-sm text-claude-dark dark:text-stone-200">{mode.name}</span>
                          <p className="text-[10px] text-stone-400">{mode.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <MenuItem
                  icon={<Layers className="h-4.5 w-4.5" />}
                  label={locale.menuHeader.scenarioLabel}
                  sublabel={locale.menuHeader.scenarioDesc}
                  onClick={() => handleMenuAction(() => setViewState('scenarioSelect'))}
                />
                <MenuItem
                  icon={<HelpCircle className="h-4.5 w-4.5" />}
                  label="未回答に挑戦"
                  sublabel="まだ解いていない問題をカテゴリ別に"
                  onClick={() => {
                    haptics.light()
                    setMenuOpen(false)
                    setShowUnansweredPicker(true)
                  }}
                />
                <MenuItem
                  icon={<BookOpenCheck className="h-4.5 w-4.5" />}
                  label={locale.menuHeader.readFirstLabel}
                  sublabel={locale.menuHeader.readFirstDesc}
                  onClick={() => handleMenuAction(() => setViewState('studyFirst'))}
                />
              </MenuSection>

              {/* Resources */}
              <MenuSection title="リファレンス">
                {bookmarkedCount > 0 ? (
                  <>
                    <MenuItem
                      icon={<Bookmark className="h-4.5 w-4.5" />}
                      label={locale.menuHeader.bookmarkLabel}
                      sublabel={locale.menuHeader.bookmarkSaving(bookmarkedCount)}
                      onClick={() => handleMenuAction(() => startSession({ mode: 'bookmark' }))}
                    />
                    <MenuItem
                      icon={<List className="h-4.5 w-4.5" />}
                      label="ブックマーク一覧"
                      sublabel="保存した問題の解説を確認"
                      onClick={() => handleMenuAction(() => openReaderWithFilter('bookmarked'))}
                    />
                  </>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="text-stone-300 dark:text-stone-600">
                      <Bookmark className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <span className="font-medium text-stone-300 dark:text-stone-600">
                        {locale.menuHeader.bookmarkEmpty}
                      </span>
                      <p className="text-xs text-stone-300 dark:text-stone-600">{locale.menuHeader.bookmarkHint}</p>
                    </div>
                  </div>
                )}
                {hasProgress && (
                  <MenuItem
                    icon={<BarChart3 className="h-4.5 w-4.5" />}
                    label={locale.progress.title}
                    sublabel={locale.menuHeader.progressDesc}
                    onClick={() => handleMenuAction(() => setViewState('progress'))}
                  />
                )}
                <MenuItem
                  icon={<BookOpen className="h-4.5 w-4.5" />}
                  label={locale.reader.title}
                  sublabel={`${totalQuestions}${locale.common.questionSuffix}の${locale.reader.subtitle}`}
                  onClick={() => handleMenuAction(() => setViewState('reader'))}
                />
              </MenuSection>

              {/* Settings */}
              <MenuSection title="設定">
                <MenuItem
                  icon={currentTheme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                  label={currentTheme === 'dark' ? locale.menuHeader.lightMode : locale.menuHeader.darkMode}
                  onClick={() => {
                    haptics.light()
                    toggleTheme()
                  }}
                />
                {!isElectron && (
                  <div className="hidden sm:block">
                    <MenuItem
                      icon={<HelpCircle className="h-4.5 w-4.5" />}
                      label={locale.menuHeader.keyboardShortcuts}
                      onClick={() => handleMenuAction(() => setShowShortcuts(true))}
                    />
                  </div>
                )}
                {isElectron ? (
                  <MenuItem
                    icon={<RefreshCw className="h-4.5 w-4.5" />}
                    label="アプリをリロード"
                    onClick={() => handleMenuAction(() => window.location.reload())}
                  />
                ) : (
                  <MenuItem
                    icon={<RefreshCw className={`h-4.5 w-4.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />}
                    label={
                      updateStatus === 'checking'
                        ? locale.menuHeader.checking
                        : updateStatus === 'latest'
                          ? locale.menuHeader.latestVersion
                          : updateStatus === 'error'
                            ? locale.menuHeader.checkFailed
                            : locale.menuHeader.updateCheck
                    }
                    onClick={handleUpdateCheck}
                  />
                )}
              </MenuSection>
            </nav>

            {/* Footer */}
            {hasProgress && streak > 0 && (
              <div className="border-t border-stone-200 px-4 py-3 dark:border-stone-700">
                <p className="text-xs text-stone-400">
                  {locale.menuHeader.streakFooter(streak, todayCount, dailyGoal)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <KeyboardShortcutHelp isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {showCategoryPicker && <CategoryPicker onClose={() => setShowCategoryPicker(false)} />}
      {showUnansweredPicker && (
        <CategoryPicker onClose={() => setShowUnansweredPicker(false)} mode="unanswered" title="未回答に挑戦" />
      )}
    </>
  )
}

/** メニューセクション区切り */
function MenuSection({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="border-b border-stone-100 py-2 dark:border-stone-800">
      {title && (
        <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

/** デイリーゴールの円形プログレス */
function DailyGoalRing({
  progress,
  achieved,
  count,
  goal,
}: {
  progress: number
  achieved: boolean
  count: number
  goal: number
}) {
  return (
    <div
      className="relative flex h-8 w-8 items-center justify-center"
      aria-label={locale.menuHeader.dailyGoalLabel(count, goal)}
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
          strokeDasharray={`${progress * 0.817} 100`}
          strokeLinecap="round"
          className={achieved ? 'text-green-500' : 'text-claude-orange'}
          stroke="currentColor"
        />
      </svg>
      <span className="absolute text-[9px] font-bold text-stone-500 dark:text-stone-400">{achieved ? '✓' : count}</span>
    </div>
  )
}
