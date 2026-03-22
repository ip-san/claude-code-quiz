import { GraduationCap } from 'lucide-react'

/** カテゴリ別の「チームに説明するときのポイント」 */
const TEACHING_TIPS: Record<string, string> = {
  memory: 'CLAUDE.md はチーム全員が編集できる「AIへの指示書」です。コーディング規約を書いておくと、AI が自動的に従ってくれます。',
  tools: 'Claude Code は「指示するだけ」ではなく、実際にファイルを読み書きしてコマンドを実行します。人間の代わりに手を動かしてくれるアシスタントです。',
  commands: 'スラッシュコマンドは AI との対話を効率化するショートカットです。/init で始めて、/compact でコンテキストを整理できます。',
  extensions: 'MCP サーバーは AI の「感覚器官」を増やすようなものです。データベースや API に直接アクセスさせることができます。',
  skills: 'スキルはチームの「定型作業マニュアル」をAIに教える仕組みです。一度作れば、チーム全員が同じ品質で作業できます。',
  session: 'セッションはAIとの「作業部屋」です。コンテキストウィンドウが一杯になったら /compact で整理して、作業を続けられます。',
  bestpractices: 'AI は「何をしてほしいか」を明確に伝えるほど良い結果を出します。曖昧な指示より、具体的なゴールを示しましょう。',
  keyboard: 'ショートカットを覚えると、AI との対話スピードが劇的に上がります。まず Escape + Enter の使い分けから始めましょう。',
}

interface TeachingTipProps {
  /** 最もよく正解したカテゴリID */
  strongestCategory: string | null
}

/**
 * 「チームに説明するなら」ヒント
 * エースは教えられる人。学んだ知識を他者に伝える力を育てる。
 */
export function TeachingTip({ strongestCategory }: TeachingTipProps) {
  if (!strongestCategory) return null
  const tip = TEACHING_TIPS[strongestCategory]
  if (!tip) return null

  return (
    <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 text-left dark:border-indigo-500/30 dark:bg-indigo-500/10">
      <div className="mb-2 flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-indigo-500" />
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">チームに説明するなら</p>
      </div>
      <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        {tip}
      </p>
    </div>
  )
}
