import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * PWA更新通知バナー
 * 新しいバージョンが利用可能な場合、画面下部にバナーを表示する。
 * Electron環境やService Worker未対応環境では何も表示しない。
 */
export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateFn, setUpdateFn] = useState<((reload: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    // Only register in browser environments with service worker support
    if (!('serviceWorker' in navigator)) return

    // Dynamic import to avoid bundling in Electron
    import('virtual:pwa-register').then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          setNeedRefresh(true)
          setUpdateFn(() => updateSW)
        },
      })
    }).catch(() => {
      // Not a PWA build (e.g., Electron) — silently ignore
    })
  }, [])

  const handleUpdate = useCallback(() => {
    if (updateFn) {
      updateFn(true)
    }
  }, [updateFn])

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-down">
      <div className="flex items-center gap-3 rounded-2xl bg-claude-dark p-4 shadow-2xl">
        <RefreshCw className="h-5 w-5 flex-shrink-0 text-claude-orange" />
        <p className="flex-1 text-sm text-white">
          新しいバージョンがあります
        </p>
        <button
          onClick={handleUpdate}
          className="tap-highlight flex-shrink-0 rounded-full bg-claude-orange px-4 py-1.5 text-sm font-semibold text-white"
        >
          更新
        </button>
      </div>
    </div>
  )
}
