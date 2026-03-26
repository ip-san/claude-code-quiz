import { Bookmark, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { DiagramRenderer } from '@/components/Quiz/diagrams/DiagramRenderer'
import { QuizText } from '@/components/Quiz/QuizText'
import { locale } from '@/config/locale'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import { getCategoryById } from '@/domain/valueObjects/Category'
import { haptics } from '@/lib/haptics'

interface ReaderCardProps {
  question: Question
  isExpanded: boolean
  onToggle: () => void
  userProgress: UserProgress
  onToggleBookmark: (id: string) => void
}

export function ReaderCard({ question, isExpanded, onToggle, userProgress, onToggleBookmark }: ReaderCardProps) {
  const cat = getCategoryById(question.category)
  const isBookmarked = userProgress.isBookmarked(question.id)
  const progress = userProgress.questionProgress[question.id]
  const hasAttempted = !!progress && progress.attempts > 0
  const lastCorrect = progress?.lastCorrect ?? false

  return (
    <div className="border-b border-stone-100 dark:border-stone-800">
      <button onClick={onToggle} className="tap-highlight flex w-full items-start gap-2 px-4 py-3 text-left">
        <span className="mt-0.5 flex-shrink-0 text-sm">{cat?.icon}</span>
        <span className="flex-1 line-clamp-2 text-sm leading-snug text-claude-dark dark:text-stone-200">
          {question.question}
        </span>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {hasAttempted && (
            <span className={`text-xs ${lastCorrect ? 'text-green-500' : 'text-red-400'}`}>
              {lastCorrect ? '✓' : '✗'}
            </span>
          )}
          {isBookmarked && <Bookmark className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-stone-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-stone-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-3 dark:border-stone-700 dark:bg-stone-900/50">
          <p className="mb-2 text-xs font-medium text-green-600 dark:text-green-400">
            {locale.reader.correctAnswer}: {question.options[question.correctIndex]?.text}
          </p>
          <div className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <QuizText text={question.explanation} />
          </div>
          {question.diagram && (
            <div className="mt-3">
              <DiagramRenderer diagram={question.diagram} />
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            {question.referenceUrl && (
              <a
                href={question.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-claude-orange"
              >
                <ExternalLink className="h-3 w-3" />
                {locale.feedback.officialDocs}
              </a>
            )}
            <button
              onClick={() => {
                haptics.light()
                onToggleBookmark(question.id)
              }}
              className="inline-flex items-center gap-1 text-xs text-stone-400"
            >
              <Bookmark className={`h-3 w-3 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              {isBookmarked ? locale.reader.bookmarked : locale.quizCard.bookmark}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
