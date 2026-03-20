import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWAインストール促進バナー
 * ブラウザで初回アクセス時に表示。インストール済みまたは閉じた場合は非表示。
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already dismissed in this session
    if (sessionStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa-install-dismissed', '1')
  }

  // Don't show if: no prompt available, already dismissed, or running as installed PWA
  if (!deferredPrompt || dismissed || window.matchMedia('(display-mode: standalone)').matches) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-3 right-3 z-40 mx-auto max-w-sm animate-slide-down">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-stone-200">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-claude-orange/10">
          <Download className="h-5 w-5 text-claude-orange" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-claude-dark">アプリをインストール</p>
          <p className="text-xs text-stone-500">ホーム画面から起動できます</p>
        </div>
        <button
          onClick={handleInstall}
          className="tap-highlight flex-shrink-0 rounded-full bg-claude-orange px-4 py-2 text-sm font-semibold text-white"
        >
          追加
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-stone-400"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
