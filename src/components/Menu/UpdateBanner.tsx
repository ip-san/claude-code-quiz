import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { locale } from '@/config/locale'
import { isElectron } from '@/lib/platformAPI'

export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<{
    latestVersion: string
    releaseUrl: string
  } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI?.checkForUpdate().then((result) => {
      if (result?.hasUpdate && result.latestVersion && result.releaseUrl) {
        setUpdateInfo({ latestVersion: result.latestVersion, releaseUrl: result.releaseUrl })
      }
    }).catch(() => {})
  }, [])

  if (!updateInfo || dismissed) return null

  return (
    <div className="mb-5 animate-slide-down rounded-2xl border border-blue-300/30 bg-linear-to-r from-blue-50 to-blue-50/50 p-4 dark:border-blue-500/30 dark:from-blue-500/10 dark:to-blue-500/5">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5 shrink-0 text-blue-500" />
        <p className="flex-1 text-sm font-medium text-claude-dark dark:text-stone-200">
          {locale.updateBanner.message(updateInfo.latestVersion)}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
          aria-label={locale.updateBanner.dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">
        <button
          onClick={() => window.electronAPI?.openExternal(updateInfo.releaseUrl)}
          className="tap-highlight inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
        >
          <Download className="h-4 w-4" />
          {locale.updateBanner.download}
        </button>
      </div>
    </div>
  )
}
