/**
 * 全体像モードのチャプター定義
 *
 * overview-ch-N タグと対応する章情報を管理する。
 * チャプター区切り表示やプログレスバーの分割に使用。
 */

export interface OverviewChapter {
  readonly id: number
  readonly tag: string
  readonly name: string
  readonly subtitle: string
  readonly icon: string
  /** このチャプターを学んだ人が明日の仕事でできる具体的なアクション */
  readonly actionItem: string
}

export const OVERVIEW_CHAPTERS: readonly OverviewChapter[] = Object.freeze([
  { id: 1, tag: 'overview-ch-1', name: 'はじめの一歩', subtitle: 'AI アシスタントとは何か、何ができるか', icon: '👋',
    actionItem: 'Claude Code をインストールして、「このプロジェクトの構成を教えて」と聞いてみる' },
  { id: 2, tag: 'overview-ch-2', name: 'AI に記憶させる', subtitle: 'プロジェクトの文脈を AI が覚えてくれる仕組み', icon: '📝',
    actionItem: 'プロジェクトのルートに CLAUDE.md を作り、開発ルールを3行書いてみる' },
  { id: 3, tag: 'overview-ch-3', name: 'AI に作業を任せる', subtitle: 'ファイル操作やコマンド実行を AI が代行する', icon: '🔧',
    actionItem: '普段手作業でやっているファイル修正を1つ、Claude Code に頼んでみる' },
  { id: 4, tag: 'overview-ch-4', name: '安全に使いこなす', subtitle: '権限管理やセキュリティの基本を押さえる', icon: '🔒',
    actionItem: '.claude/settings.json を確認し、チームに合った権限設定を1つ追加する' },
  { id: 5, tag: 'overview-ch-5', name: '自分だけの AI を作る', subtitle: '拡張機能で AI をチームの業務に合わせる', icon: '🧩',
    actionItem: 'チームの定型作業を1つ選び、スラッシュコマンド（スキル）として定義してみる' },
  { id: 6, tag: 'overview-ch-6', name: '現場で活かす', subtitle: '実務で成果を出すためのベストプラクティス', icon: '🚀',
    actionItem: '今週のタスクを1つ選び、Claude Code と一緒に完了させてみる' },
])

/**
 * Question の tags から所属チャプターを取得
 */
export function getChapterFromTags(tags: readonly string[]): OverviewChapter | null {
  const chapterTag = tags.find(t => t.startsWith('overview-ch-'))
  if (!chapterTag) return null
  return OVERVIEW_CHAPTERS.find(ch => ch.tag === chapterTag) ?? null
}
