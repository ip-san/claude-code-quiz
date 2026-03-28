import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DiagramRenderer } from '@/components/Quiz/diagrams/DiagramRenderer'
import { QuizText } from '@/components/Quiz/QuizText'
import type { Question } from '@/domain/entities/Question'
import type { UserProgress } from '@/domain/entities/UserProgress'
import {
  getOverviewQuestionsOrdered,
  OVERVIEW_CHAPTERS,
  type OverviewChapter,
} from '@/domain/valueObjects/OverviewChapter'
import { trackStudyFirst } from '@/lib/analytics'
import { haptics } from '@/lib/haptics'
import { headerStyles } from '@/lib/styles'

interface StudyFirstViewProps {
  allQuestions: readonly Question[]
  userProgress: UserProgress
  onBack: () => void
  onStartQuiz: (chapterId: number, startIndex: number) => void
}

/**
 * 「読んでから解く」モード
 *
 * チャプターを選択 → 解説を読む → クイズに挑戦 の3ステップ。
 * 初心者が解説を先に読んでから問題に取り組める導線を提供する。
 */
export function StudyFirstView({ allQuestions, userProgress, onBack, onStartQuiz }: StudyFirstViewProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null)
  const [readingComplete, setReadingComplete] = useState(false)

  const overviewQuestions = useMemo(() => getOverviewQuestionsOrdered(allQuestions), [allQuestions])

  const chapters = useMemo(() => {
    return OVERVIEW_CHAPTERS.map((ch) => {
      const questions = overviewQuestions.filter((q) => q.tags.includes(ch.tag))
      const startIndex = questions[0] ? overviewQuestions.indexOf(questions[0]) : 0
      let answered = 0
      for (const q of questions) {
        const p = userProgress.questionProgress[q.id]
        if (p && p.attempts > 0) answered++
      }
      return { ...ch, questions, startIndex, total: questions.length, answered }
    })
  }, [overviewQuestions, userProgress])

  const selectedChapter = selectedChapterId !== null ? chapters.find((ch) => ch.id === selectedChapterId) : null

  if (selectedChapter && !readingComplete) {
    return (
      <StudyReader
        chapter={selectedChapter}
        questions={selectedChapter.questions}
        onBack={() => {
          setSelectedChapterId(null)
          setReadingComplete(false)
        }}
        onComplete={() => {
          trackStudyFirst(selectedChapter.id, 'finish_reading')
          setReadingComplete(true)
        }}
      />
    )
  }

  if (selectedChapter && readingComplete) {
    return (
      <ReadyToQuiz
        chapter={selectedChapter}
        questionCount={selectedChapter.total}
        onStartQuiz={() => {
          trackStudyFirst(selectedChapter.id, 'start_quiz')
          onStartQuiz(selectedChapter.id, selectedChapter.startIndex)
        }}
        onReread={() => setReadingComplete(false)}
        onBack={() => {
          setSelectedChapterId(null)
          setReadingComplete(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-dvh bg-claude-cream dark:bg-stone-900">
      {/* Header */}
      <div className={headerStyles.sticky}>
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="tap-highlight rounded-full p-1" aria-label="戻る">
              <ArrowLeft className="h-5 w-5 text-stone-600 dark:text-stone-300" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-claude-dark dark:text-stone-100">読んでから解く</h1>
              <p className="text-xs text-stone-400">解説を読んでからクイズに挑戦</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* Explanation */}
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">学習の進め方</p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                チャプターを選んで、まず解説を読みましょう。内容を理解したら、クイズで知識を確認できます。
                予習してから問題に取り組むので、初心者でも安心です。
              </p>
            </div>
          </div>
        </div>

        {/* Chapter list */}
        <div className="space-y-3">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                haptics.light()
                trackStudyFirst(ch.id, 'start_reading')
                setSelectedChapterId(ch.id)
                setReadingComplete(false)
              }}
              className="tap-highlight flex w-full items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-claude-orange/30 dark:border-stone-700 dark:bg-stone-800"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-claude-orange/10">
                <span className="text-2xl">{ch.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-claude-orange">Ch.{ch.id}</span>
                  {ch.answered === ch.total && ch.total > 0 && <span className="text-xs">✅</span>}
                </div>
                <p className="text-sm font-semibold text-claude-dark dark:text-stone-200">{ch.name}</p>
                <p className="text-xs text-stone-400">{ch.subtitle}</p>
                <p className="mt-1 text-xs text-stone-400">{ch.total}問</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-stone-300 dark:text-stone-600" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 解説リーダー（チャプター単位）
 * 1問ずつ解説を表示し、スワイプ or ボタンで進む
 */
function StudyReader({
  chapter,
  questions,
  onBack,
  onComplete,
}: {
  chapter: OverviewChapter
  questions: readonly Question[]
  onBack: () => void
  onComplete: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const question = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  const goNext = () => {
    haptics.light()
    if (isLast) {
      onComplete()
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const goPrev = () => {
    haptics.light()
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  if (!question) return null

  return (
    <div className="flex min-h-dvh flex-col bg-claude-cream dark:bg-stone-900">
      {/* Header */}
      <div className={headerStyles.sticky}>
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="tap-highlight rounded-full p-1" aria-label="戻る">
                <ArrowLeft className="h-5 w-5 text-stone-600 dark:text-stone-300" />
              </button>
              <div>
                <span className="text-xs font-medium text-claude-orange">
                  {chapter.icon} Ch.{chapter.id}
                </span>
                <p className="text-sm font-semibold text-claude-dark dark:text-stone-200">{chapter.name}</p>
              </div>
            </div>
            <span className="text-sm text-stone-400">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
            <div
              className="h-full rounded-full progress-gradient transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        <div className="mx-auto max-w-3xl" key={question.id} aria-live="polite">
          <div className="animate-slide-in-right rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-800">
            {/* Question as title */}
            <h3 className="mb-4 text-base font-semibold leading-snug text-claude-dark dark:text-stone-100">
              <QuizText text={question.question} />
            </h3>

            {/* Correct answer highlight */}
            <div className="mb-3 rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">正解</p>
              <p className="mt-1 text-sm font-medium text-green-800 dark:text-green-200">
                {question.options[question.correctIndex]?.text}
              </p>
            </div>

            {/* Explanation */}
            <div className="mb-3">
              <p className="mb-1 text-xs font-semibold text-stone-500">解説</p>
              <div className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                <QuizText text={question.explanation} />
              </div>
            </div>

            {/* Diagram if available */}
            {question.diagram && (
              <div className="mt-3">
                <DiagramRenderer diagram={question.diagram} />
              </div>
            )}

            {/* Wrong answer explanations */}
            {question.options.some((opt, i) => i !== question.correctIndex && opt.wrongFeedback) && (
              <div className="mt-4 rounded-xl bg-stone-50 p-3 dark:bg-stone-900/50">
                <p className="mb-2 text-xs font-semibold text-stone-500">よくある間違い</p>
                <div className="space-y-2">
                  {question.options.map(
                    (opt, i) =>
                      i !== question.correctIndex &&
                      opt.wrongFeedback && (
                        <div key={i} className="text-xs text-stone-500 dark:text-stone-400">
                          <span className="font-medium text-red-400">✗ {opt.text}</span>
                          <span className="mx-1">—</span>
                          {opt.wrongFeedback}
                        </div>
                      )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 border-t border-stone-200 bg-white/80 px-4 py-3 backdrop-blur-sm dark:border-stone-700 dark:bg-stone-800/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={`tap-highlight flex h-11 w-11 items-center justify-center rounded-xl border ${
              currentIndex === 0
                ? 'border-stone-200 text-stone-300 dark:border-stone-700 dark:text-stone-600'
                : 'border-stone-300 text-stone-600 dark:border-stone-600 dark:text-stone-300'
            }`}
            aria-label="前の解説"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goNext}
            className="tap-highlight flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-claude-orange text-sm font-semibold text-white"
          >
            {isLast ? (
              <>
                読み終えた
                <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                次の解説
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 読了後のクイズ開始確認画面
 */
function ReadyToQuiz({
  chapter,
  questionCount,
  onStartQuiz,
  onReread,
  onBack,
}: {
  chapter: OverviewChapter
  questionCount: number
  onStartQuiz: () => void
  onReread: () => void
  onBack: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-claude-cream px-6 dark:bg-stone-900">
      <div className="w-full max-w-sm animate-view-enter text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>

        <h2 className="mb-2 text-xl font-bold text-claude-dark dark:text-stone-100">解説を読み終えました！</h2>
        <p className="mb-1 text-sm text-stone-500">
          {chapter.icon} Ch.{chapter.id}: {chapter.name}
        </p>
        <p className="mb-6 text-xs text-stone-400">
          学んだ内容を {questionCount}問のクイズで確認しましょう。 解説を読んだ後なので、きっと解けるはずです。
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              haptics.light()
              onStartQuiz()
            }}
            className="tap-highlight flex w-full items-center justify-center gap-2 rounded-2xl bg-claude-orange py-3.5 text-base font-semibold text-white shadow-md"
          >
            <Play className="h-5 w-5 fill-white" />
            クイズに挑戦する
          </button>
          <button
            onClick={() => {
              haptics.light()
              onReread()
            }}
            className="tap-highlight w-full rounded-2xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
          >
            もう一度読む
          </button>
          <button onClick={onBack} className="tap-highlight w-full py-2 text-sm text-stone-400">
            チャプター選択に戻る
          </button>
        </div>
      </div>
    </div>
  )
}
