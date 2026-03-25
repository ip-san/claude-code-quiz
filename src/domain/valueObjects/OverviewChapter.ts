/**
 * 全体像モードのチャプター定義
 *
 * overview-ch-N タグと対応する章情報を管理する。
 * チャプター区切り表示やプログレスバーの分割に使用。
 */
import { theme } from '@/config/theme'

export interface OverviewChapter {
  readonly id: number
  readonly tag: string
  readonly name: string
  readonly subtitle: string
  readonly icon: string
  /** このチャプターを学んだ人が明日の仕事でできる具体的なアクション */
  readonly actionItem: string
}

// quizzes.json の tags と一致するよう、id からタグ文字列を生成
export const OVERVIEW_CHAPTERS: readonly OverviewChapter[] = Object.freeze(
  theme.overviewChapters.map(ch => ({
    ...ch,
    tag: `overview-ch-${ch.id}`,
  }))
)

/**
 * Question の tags から所属チャプターを取得
 */
export function getChapterFromTags(tags: readonly string[]): OverviewChapter | null {
  const chapterTag = tags.find(t => t.startsWith('overview-ch-'))
  if (!chapterTag) return null
  return OVERVIEW_CHAPTERS.find(ch => ch.tag === chapterTag) ?? null
}
