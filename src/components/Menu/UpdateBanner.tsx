import { AlertTriangle, Download, ExternalLink, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { locale } from '@/config/locale'
import { isElectron } from '@/lib/platformAPI'

interface UpdateInfo {
  latestVersion: string
  releaseUrl: string
  downloadUrl: string | null
  forceUpdate: boolean
}

export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI
      ?.checkForUpdate()
      .then((result) => {
        if (result?.hasUpdate && result.latestVersion && result.releaseUrl) {
          setUpdateInfo({
            latestVersion: result.latestVersion,
            releaseUrl: result.releaseUrl,
            downloadUrl: result.downloadUrl,
            forceUpdate: result.forceUpdate,
          })
        }
      })
      .catch(() => {
        /* non-critical: Electron IPC may fail */
      })
  }, [])

  if (!updateInfo || (dismissed && !updateInfo.forceUpdate)) return null

  const isForce = updateInfo.forceUpdate
  const borderColor = isForce
    ? 'border-red-300/30 dark:border-red-500/30'
    : 'border-blue-300/30 dark:border-blue-500/30'
  const bgGradient = isForce
    ? 'from-red-50 to-red-50/50 dark:from-red-500/10 dark:to-red-500/5'
    : 'from-blue-50 to-blue-50/50 dark:from-blue-500/10 dark:to-blue-500/5'
  const iconColor = isForce ? 'text-red-500' : 'text-blue-500'
  const btnColor = isForce ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'

  const message = isForce
    ? locale.updateBanner.forceMessage(updateInfo.latestVersion)
    : locale.updateBanner.message(updateInfo.latestVersion)

  const Icon = isForce ? AlertTriangle : Download

  return (
    <div className={`mb-5 animate-slide-down rounded-2xl border bg-linear-to-r p-4 ${borderColor} ${bgGradient}`}>
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
        <p className="flex-1 text-sm font-medium text-claude-dark dark:text-stone-200">{message}</p>
        {!isForce && (
          <button
            onClick={() => setDismissed(true)}
            className="rounded-full p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            aria-label={locale.updateBanner.dismiss}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {updateInfo.downloadUrl ? (
          <>
            <button
              onClick={() => window.electronAPI?.openExternal(updateInfo.downloadUrl!)}
              className={`tap-highlight inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white ${btnColor}`}
            >
              <Download className="h-4 w-4" />
              {locale.updateBanner.download}
            </button>
            <button
              onClick={() => window.electronAPI?.openExternal(updateInfo.releaseUrl)}
              className="inline-flex items-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {locale.updateBanner.openRelease}
            </button>
          </>
        ) : (
          <button
            onClick={() => window.electronAPI?.openExternal(updateInfo.releaseUrl)}
            className={`tap-highlight inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white ${btnColor}`}
          >
            <ExternalLink className="h-4 w-4" />
            {locale.updateBanner.openRelease}
          </button>
        )}
      </div>
    </div>
  )
}
