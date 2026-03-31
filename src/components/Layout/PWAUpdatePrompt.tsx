import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isElectron } from '@/lib/platformAPI'

/**
 * PWA更新通知バナー
 *
 * registerType: 'autoUpdate' により、新バージョンは自動適用される。
 * このコンポーネントは更新適用後にリロードを促すバナーを表示する。
 */
export function PWAUpdatePrompt() {
  const [updated, setUpdated] = useState(false)

  useEffect(() => {
    if (isElectron || !('serviceWorker' in navigator)) return

    const handleControllerChange = () => setUpdated(true)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
  }, [])

  if (!updated) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-down">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-stone-200 dark:bg-claude-dark dark:ring-transparent">
        <RefreshCw className="h-5 w-5 flex-shrink-0 text-claude-orange" />
        <p className="flex-1 text-sm text-stone-800 dark:text-white">更新されました</p>
        <button
          onClick={() => window.location.reload()}
          className="tap-highlight flex-shrink-0 rounded-full bg-claude-orange px-4 py-2.5 text-sm font-semibold text-white"
        >
          再読込
        </button>
      </div>
    </div>
  )
}
