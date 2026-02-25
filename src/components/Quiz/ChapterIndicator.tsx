import type { OverviewChapter } from '@/domain/valueObjects/OverviewChapter'

interface ChapterIndicatorProps {
  chapter: OverviewChapter
  totalChapters: number
}

/**
 * 全体像モードのチャプター区切り表示
 * 新しいチャプターに入ったタイミングで QuizCard の上に表示する
 */
export function ChapterIndicator({ chapter, totalChapters }: ChapterIndicatorProps) {
  return (
    <div className="mb-4 rounded-xl border border-claude-orange/20 bg-gradient-to-r from-claude-orange/5 to-transparent px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{chapter.icon}</span>
        <div>
          <p className="text-xs font-medium text-claude-orange">
            Chapter {chapter.id} / {totalChapters}
          </p>
          <p className="text-sm font-semibold text-claude-dark">
            {chapter.name}
          </p>
        </div>
      </div>
    </div>
  )
}
