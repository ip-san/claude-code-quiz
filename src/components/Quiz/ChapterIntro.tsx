import { ArrowRight, BookOpen, Brain, CheckCircle2 } from 'lucide-react'
import type { OverviewChapter } from '@/domain/valueObjects/OverviewChapter'
import { OVERVIEW_CHAPTERS } from '@/domain/valueObjects/OverviewChapter'
import { haptics } from '@/lib/haptics'

interface ChapterIntroProps {
  chapter: OverviewChapter
  onStart: () => void
}

/**
 * チャプター導入画面（全体像モード）
 *
 * 各チャプター開始時にフルページで表示。
 * 「知らなくて当然」のメッセージで初心者の不安を軽減し、
 * 何を学ぶかの概要を伝えてからクイズに進む。
 */

const CHAPTER_DETAILS: Record<
  number,
  {
    learningPoints: string[]
    encouragement: string
    realWorldExample: string
  }
> = {
  1: {
    learningPoints: [
      'Claude Code がどんなツールなのか',
      'ターミナルから AI に話しかける仕組み',
      '最初の一言で何ができるか',
    ],
    encouragement:
      'プログラミング経験やAIの知識は一切不要です。「こんなツールがあるんだ」くらいの気持ちで進めましょう。',
    realWorldExample:
      '例: ターミナルで「このプロジェクトの構成を教えて」と聞くだけで、AIがコード全体を分析してくれます',
  },
  2: {
    learningPoints: [
      'CLAUDE.md ファイルの役割と書き方',
      'AI にプロジェクトのルールを覚えさせる方法',
      '記憶の仕組み（永続メモリ）',
    ],
    encouragement: '「設定ファイル」と聞くと難しそうですが、実はメモ帳に箇条書きするだけです。',
    realWorldExample: '例:「テストは必ず書いて」と CLAUDE.md に書くだけで、AI が毎回テストを書いてくれます',
  },
  3: {
    learningPoints: [
      'ファイルの読み書き・編集を AI に任せる方法',
      'コマンド実行の仕組みと安全性',
      'どこまで自動化できるか',
    ],
    encouragement: 'AI に任せるのが怖い？大丈夫、実行前に必ず確認があります。まずは仕組みを知りましょう。',
    realWorldExample: '例:「この関数名を全部キャメルケースに変えて」→ AI が関連ファイルを一括修正',
  },
  4: {
    learningPoints: [
      '権限設定で AI にできることを制限する方法',
      'サンドボックスの仕組み',
      'チームで安全に使うためのルール',
    ],
    encouragement: 'セキュリティの専門知識は不要です。「どんな安全装置があるか」を知るだけで十分です。',
    realWorldExample: '例: settings.json で「npm test は自動実行OK」「git push は毎回確認」と設定できます',
  },
  5: {
    learningPoints: [
      'MCP サーバーで AI の能力を拡張する方法',
      'Hooks で自動化パイプラインを作る方法',
      'スキル（スラッシュコマンド）の作り方',
    ],
    encouragement: 'ここからは応用編です。全部覚える必要はありません。「こんなことができるんだ」と把握できればOK。',
    realWorldExample: '例: /deploy というスキルを作れば、デプロイ手順を毎回 AI に説明する必要がなくなります',
  },
  6: {
    learningPoints: ['効果的なプロンプトの書き方', 'AI との協働ワークフロー', 'チーム導入のベストプラクティス'],
    encouragement: '最終チャプターです！ここまでの知識を実務でどう活かすかを学びます。',
    realWorldExample: '例:「要件を箇条書きで伝える」だけで、AI の出力品質が劇的に向上します',
  },
}

export function ChapterIntro({ chapter, onStart }: ChapterIntroProps) {
  const details = CHAPTER_DETAILS[chapter.id]
  const totalChapters = OVERVIEW_CHAPTERS.length
  const isFirstChapter = chapter.id === 1

  return (
    <div className="animate-view-enter space-y-4">
      {/* Chapter number badge */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-claude-orange/10">
          <span className="text-3xl">{chapter.icon}</span>
        </div>
        <p className="text-xs font-semibold text-claude-orange">
          Chapter {chapter.id} / {totalChapters}
        </p>
        <h2 className="mt-1 text-xl font-bold text-claude-dark dark:text-stone-100">{chapter.name}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{chapter.subtitle}</p>
      </div>

      {/* Encouragement card */}
      {isFirstChapter && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <Brain className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">間違えても大丈夫！</p>
              <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                このクイズは「テスト」ではなく「学習ツール」です。
                知らない問題が出ても、解説を読めば理解できるように作られています。 気軽に進めてください。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Learning points */}
      {details && (
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-800">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-claude-orange" />
            <p className="text-sm font-semibold text-claude-dark dark:text-stone-200">このチャプターで学ぶこと</p>
          </div>
          <ul className="space-y-2">
            {details.learningPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-claude-orange/60" />
                <span className="text-sm text-stone-600 dark:text-stone-300">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Real world example */}
      {details && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
          <p className="text-xs text-stone-500 dark:text-stone-400">{details.realWorldExample}</p>
        </div>
      )}

      {/* Encouragement message */}
      {details && <p className="text-center text-xs text-stone-400 dark:text-stone-500">{details.encouragement}</p>}

      {/* Start button */}
      <div className="pt-2 text-center">
        <button
          onClick={() => {
            haptics.light()
            onStart()
          }}
          className="tap-highlight inline-flex items-center gap-2 rounded-2xl bg-claude-orange px-8 py-3.5 text-base font-semibold text-white shadow-md"
        >
          {isFirstChapter ? '学習を始める' : 'チャプターを始める'}
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
