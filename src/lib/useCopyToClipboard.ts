import { useCallback, useState } from 'react'

/**
 * クリップボードコピー + 一時的な「コピー済み」表示を管理するフック
 * 3箇所で同じパターンが重複していたのを統一
 */
export function useCopyToClipboard(duration = 2000) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), duration)
      } catch {
        /* clipboard API unavailable */
      }
    },
    [duration]
  )

  return { copied, copy }
}
