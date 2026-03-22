import { useState } from 'react'
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * カテゴリ別の実践プロンプト集
 *
 * クイズで学んだ知識を、実際のClaude Codeで試すための
 * コピー可能なプロンプトを提供する。
 * 知識 → 実践 の橋渡し。
 */

/** 各カテゴリで「今すぐ試せる」Claude Code プロンプト */
const PRACTICE_PROMPTS: Record<string, { prompt: string; desc: string }[]> = {
  memory: [
    { prompt: 'このプロジェクトの構成を教えて。主要なディレクトリとその役割を説明して', desc: 'AI にプロジェクトを理解させる第一歩' },
    { prompt: 'CLAUDE.md を作成して。このプロジェクトの開発ルールをまとめて', desc: 'AI の記憶を設定する' },
  ],
  tools: [
    { prompt: 'src/ 以下で TODO コメントを全て検索して一覧にして', desc: 'Grep ツールの実践' },
    { prompt: 'このファイルのテストを書いて', desc: 'AI にコード生成を任せる' },
  ],
  commands: [
    { prompt: '/init', desc: 'プロジェクトの CLAUDE.md を自動生成' },
    { prompt: '/compact', desc: 'コンテキストを圧縮して会話を続行' },
  ],
  extensions: [
    { prompt: '.claude/settings.json を確認して、現在の権限設定を教えて', desc: '設定の確認' },
    { prompt: 'このプロジェクトに合った MCP サーバーを提案して', desc: '拡張機能の活用' },
  ],
  skills: [
    { prompt: 'チームでよく使うコードレビューの手順をスキルとして定義して', desc: 'カスタムスキルの作成' },
  ],
  session: [
    { prompt: 'このバグを調査して。関連するファイルを全て読んでから原因を特定して', desc: 'マルチファイル調査の実践' },
  ],
  bestpractices: [
    { prompt: 'このコードをリファクタリングして。変更理由も説明して', desc: 'AI との協働開発' },
    { prompt: 'このプルリクエストの説明文を書いて', desc: 'AI による文書作成' },
  ],
  keyboard: [
    { prompt: 'Esc を押してから /help と入力', desc: 'コマンドパレットの操作' },
  ],
}

interface PracticePromptsProps {
  /** 正解したカテゴリIDのリスト */
  correctCategories: string[]
}

export function PracticePrompts({ correctCategories }: PracticePromptsProps) {
  const [expanded, setExpanded] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  // 正解したカテゴリから実践プロンプトを収集
  const prompts = correctCategories
    .flatMap(catId => (PRACTICE_PROMPTS[catId] ?? []).map(p => ({ ...p, catId })))
    .slice(0, expanded ? 6 : 2)

  if (prompts.length === 0) return null

  const totalAvailable = correctCategories
    .reduce((sum, catId) => sum + (PRACTICE_PROMPTS[catId]?.length ?? 0), 0)

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPrompt(text)
      setTimeout(() => setCopiedPrompt(null), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-left dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <div className="mb-3 flex items-center gap-2">
        <Terminal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">今すぐ試せるプロンプト</p>
      </div>
      <div className="space-y-2">
        {prompts.map((p) => (
          <div key={`${p.catId}-${p.prompt}`} className="rounded-xl bg-white p-3 dark:bg-stone-800">
            <p className="mb-1 text-xs text-stone-400">{p.desc}</p>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-sm text-claude-dark dark:text-stone-200">{p.prompt}</code>
              <button
                onClick={() => handleCopy(p.prompt)}
                className="tap-highlight flex-shrink-0 rounded-lg p-1.5 text-stone-400 hover:text-stone-600"
                aria-label="コピー"
              >
                {copiedPrompt === p.prompt ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      {totalAvailable > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> 閉じる</>
          ) : (
            <><ChevronDown className="h-3 w-3" /> もっと見る（{totalAvailable - 2}件）</>
          )}
        </button>
      )}
    </div>
  )
}
