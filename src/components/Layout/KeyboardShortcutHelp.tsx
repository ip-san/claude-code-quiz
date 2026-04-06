import { Keyboard, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { locale } from '@/config/locale'

interface KeyboardShortcutHelpProps {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { section: locale.shortcuts.quizSection },
  { keys: ['1', '~', '6'], desc: locale.shortcuts.selectOption },
  { keys: ['↑', '↓'], desc: locale.shortcuts.moveOption },
  { keys: ['Enter', 'Space'], desc: locale.shortcuts.submitNext },
  { keys: ['R'], desc: locale.shortcuts.retry },
  { section: locale.shortcuts.shortcutSection },
  { keys: ['?'], desc: locale.shortcuts.showHelp },
  { keys: ['Esc'], desc: locale.shortcuts.closeDialog },
] as const

/**
 * キーボードショートカット一覧のオーバーレイ
 * ? キーで表示
 */
export function KeyboardShortcutHelp({ isOpen, onClose }: KeyboardShortcutHelpProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        onClose()
        return
      }
      // Focus trap: Shift+Tab from first → last, Tab from last → first
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, [tabindex]')
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  // Auto-focus close button
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const btn = dialogRef.current.querySelector('button')
      btn?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={locale.menuHeader.keyboardShortcuts}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={dialogRef}
        className="relative mx-4 w-full max-w-sm animate-bounce-in rounded-2xl bg-white p-6 shadow-2xl dark:bg-stone-800"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-claude-orange" />
            <h2 className="text-lg font-bold text-claude-dark">{locale.shortcuts.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="tap-highlight rounded-full p-1.5 text-stone-400 hover:text-stone-600"
            aria-label={locale.common.close}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-1">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item && !('keys' in item)) {
              return (
                <div
                  key={i}
                  className={`${i > 0 ? 'mt-3' : ''} text-xs font-semibold uppercase tracking-wider text-stone-500`}
                >
                  {item.section}
                </div>
              )
            }

            if ('keys' in item && 'desc' in item) {
              return (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-claude-dark">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((key, j) => (
                      <kbd
                        key={j}
                        className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-stone-300 bg-stone-50 px-1.5 py-0.5 text-xs font-medium text-stone-600 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              )
            }

            return null
          })}
        </div>

        <div className="mt-4 text-center text-xs text-stone-500">
          <kbd className="rounded border border-stone-300 bg-stone-50 px-1.5 py-0.5 text-xs dark:border-stone-600 dark:bg-stone-700">
            ?
          </kbd>{' '}
          {locale.shortcuts.showAnytime}
        </div>
      </div>
    </div>
  )
}
