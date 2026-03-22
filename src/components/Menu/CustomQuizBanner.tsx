import { Sparkles } from 'lucide-react'

/**
 * カスタムクイズ生成のCTAバナー
 * 将来的にはClaude APIと連携してURLからクイズを自動生成
 * 現時点では /generate-quiz-data スキルへの導線
 */
export function CustomQuizBanner() {
  return (
    <div className="mb-5 rounded-2xl border border-dashed border-claude-orange/30 bg-gradient-to-r from-claude-orange/5 to-transparent p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-claude-orange/10">
          <Sparkles className="h-5 w-5 text-claude-orange" />
        </div>
        <div>
          <p className="text-sm font-semibold text-claude-dark">
            自分だけのクイズを作ろう
          </p>
          <p className="text-xs text-stone-500">
            Claude Code で <code className="rounded bg-stone-100 px-1 text-claude-orange dark:bg-stone-800">/generate-quiz-data</code> を実行
          </p>
        </div>
      </div>
    </div>
  )
}
