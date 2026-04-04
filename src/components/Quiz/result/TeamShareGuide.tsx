import { Check, Copy, Users } from 'lucide-react'
import { theme } from '@/config/theme'
import { useCopyToClipboard } from '@/lib/useCopyToClipboard'

interface TeamShareGuideProps {
  percentage: number
  mode: string
}

/**
 * 全体像モード完了後に表示される「チームに広げる」ガイド
 *
 * 学んだ個人が次のステップとして、チーム全体のAI活用を推進するための
 * 具体的なアクションプランとシェア可能なメッセージを提供する。
 * 個人の学び → チームの変革 への橋渡し。
 */
export function TeamShareGuide({ percentage, mode }: TeamShareGuideProps) {
  const { copied, copy } = useCopyToClipboard()

  // 全体像モード完了時のみ表示
  if (mode !== 'overview' || percentage < 50) return null

  const shareMessage = theme.teamShareTemplate.replace('${percentage}', String(percentage))

  const handleCopy = () => copy(shareMessage)

  return (
    <div className="mt-6 rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50 to-indigo-50 p-5 text-left dark:border-purple-500/30 dark:from-purple-500/10 dark:to-indigo-500/10">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-purple-500" />
        <p className="text-sm font-bold text-purple-700 dark:text-purple-300">チームに広げる</p>
      </div>

      <p className="mb-4 text-sm text-claude-dark">
        あなたが学んだことを、チームにも共有しましょう。 AI
        駆動開発は一人では完結しません。チーム全体で取り組むことで、本当の変革が起こります。
      </p>

      {/* 3-step team action plan */}
      <div className="mb-4 space-y-2">
        {theme.teamShareSteps.map((step, i) => (
          <div key={step} className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-500 text-xs font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm text-stone-600 dark:text-stone-400">{step}</p>
          </div>
        ))}
      </div>

      {/* Copy shareable message */}
      <button
        onClick={handleCopy}
        className="tap-highlight inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-medium text-white"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            コピーしました
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            チームへの提案メッセージをコピー
          </>
        )}
      </button>

      <p className="mt-2 text-center text-xs text-stone-500">Slack やメールにそのまま貼り付けられます</p>
    </div>
  )
}
