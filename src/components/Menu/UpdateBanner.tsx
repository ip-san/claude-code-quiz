import { AlertTriangle, Download, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { locale } from '@/config/locale'
import { isElectron } from '@/lib/platformAPI'

/**
 * 強制更新バナー — リリースノートに <!-- force-update --> マーカーがある場合のみ表示。
 * 通常の更新通知はメニュー内の「更新を確認」→「最新版をダウンロード」ボタンに統合済み。
 */
export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<{
    latestVersion: string
    releaseUrl: string
    downloadUrl: string | null
  } | null>(null)

  useEffect(() => {
    if (!isElectron) return
    let cancelled = false
    window.electronAPI
      ?.checkForUpdate()
      .then((result) => {
        if (cancelled) return
        if (result?.hasUpdate && result.forceUpdate && result.latestVersion && result.releaseUrl) {
          setUpdateInfo({
            latestVersion: result.latestVersion,
            releaseUrl: result.releaseUrl,
            downloadUrl: result.downloadUrl,
          })
        }
      })
      .catch(() => {
        /* non-critical */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!updateInfo) return null

  return (
    <div className="mb-5 animate-slide-down rounded-2xl border border-red-300/30 bg-linear-to-r from-red-50 to-red-50/50 p-4 dark:border-red-500/30 dark:from-red-500/10 dark:to-red-500/5">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
        <p className="flex-1 text-sm font-medium text-claude-dark dark:text-stone-200">
          {locale.updateBanner.forceMessage(updateInfo.latestVersion)}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {updateInfo.downloadUrl ? (
          <>
            <button
              onClick={() => updateInfo.downloadUrl && window.electronAPI?.openExternal(updateInfo.downloadUrl)}
              className="tap-highlight inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
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
            className="tap-highlight inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            <ExternalLink className="h-4 w-4" />
            {locale.updateBanner.openRelease}
          </button>
        )}
      </div>
    </div>
  )
}
