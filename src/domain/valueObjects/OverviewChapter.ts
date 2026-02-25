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
  readonly icon: string
}

export const OVERVIEW_CHAPTERS: readonly OverviewChapter[] = Object.freeze([
  { id: 1, tag: 'overview-ch-1', name: 'Claude Codeとは / 導入', icon: '👋' },
  { id: 2, tag: 'overview-ch-2', name: 'CLAUDE.md / Memory', icon: '📝' },
  { id: 3, tag: 'overview-ch-3', name: 'ツールとコマンド操作', icon: '🔧' },
  { id: 4, tag: 'overview-ch-4', name: 'セッションと権限', icon: '🔒' },
  { id: 5, tag: 'overview-ch-5', name: 'Skills / MCP / 拡張', icon: '🧩' },
  { id: 6, tag: 'overview-ch-6', name: '実践活用', icon: '🚀' },
])

/**
 * Question の tags から所属チャプターを取得
 */
export function getChapterFromTags(tags: readonly string[]): OverviewChapter | null {
  const chapterTag = tags.find(t => t.startsWith('overview-ch-'))
  if (!chapterTag) return null
  return OVERVIEW_CHAPTERS.find(ch => ch.tag === chapterTag) ?? null
}
