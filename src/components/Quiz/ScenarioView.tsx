import { ArrowRight, BookOpen } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { QuizCard } from '@/components/Quiz/QuizCard'
import { SCENARIOS, type ScenarioData } from '@/data/scenarios'
import { useQuizStore } from '@/stores/quizStore'

/** Narrative interstitial between questions */
function ScenarioNarrative({ text, onNext, stepLabel }: { text: string; onNext: () => void; stepLabel: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm dark:from-stone-800 dark:to-stone-800">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
          <BookOpen className="h-4 w-4" />
          {stepLabel}
        </div>
        <p className="mb-6 text-base leading-relaxed text-stone-700 dark:text-stone-300">{text}</p>
        <button
          onClick={onNext}
          className="tap-highlight flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.97] dark:bg-blue-700"
        >
          次へ
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * ScenarioView wraps QuizCard with narrative interstitials.
 * Tracks which narrative steps have been shown based on question progress.
 */
export function ScenarioView({ scenario, isModalOpen }: { scenario: ScenarioData; isModalOpen: boolean }) {
  const { sessionState } = useQuizStore()
  const currentQuestionIndex = sessionState?.currentIndex ?? 0

  // Build a map: questionIndex -> preceding narrative texts
  const narrativeMap = useMemo(() => {
    const map: Record<number, string[]> = {}
    let qIdx = 0
    let pending: string[] = []

    for (const step of scenario.steps) {
      if (step.type === 'narrative' && step.text) {
        pending.push(step.text)
      } else if (step.type === 'question') {
        if (pending.length > 0) {
          map[qIdx] = [...pending]
          pending = []
        }
        qIdx++
      }
    }
    // Epilogue: narratives after the last question (shown at qIdx = total questions)
    if (pending.length > 0) {
      map[qIdx] = [...pending]
    }
    return map
  }, [scenario])

  // Track which narratives have been dismissed
  const [dismissedForIndex, setDismissedForIndex] = useState<Set<number>>(new Set())
  const [narrativePageIndex, setNarrativePageIndex] = useState(0)

  // Reset narrative page when question changes
  useEffect(() => {
    setNarrativePageIndex(0)
  }, [currentQuestionIndex])

  const questionCount = scenario.steps.filter((s) => s.type === 'question').length
  const [showEpilogue, setShowEpilogue] = useState(false)

  // Detect when user clicks "next" on the last answered question → show epilogue
  const prevIndexRef = useRef(currentQuestionIndex)
  useEffect(() => {
    // If last question was answered and index didn't change (nextQuestion on last question),
    // it means the session is about to end — show epilogue first
    if (
      currentQuestionIndex === questionCount - 1 &&
      prevIndexRef.current === questionCount - 1 &&
      sessionState?.isAnswered === false &&
      narrativeMap[questionCount]
    ) {
      setShowEpilogue(true)
    }
    prevIndexRef.current = currentQuestionIndex
  }, [currentQuestionIndex, sessionState?.isAnswered, questionCount, narrativeMap])

  // For epilogue: show at questionCount index after user proceeds from last question's feedback
  const narrativeKey = showEpilogue ? questionCount : currentQuestionIndex
  const narratives = narrativeMap[narrativeKey]
  const hasNarrative = narratives && narratives.length > 0 && !dismissedForIndex.has(narrativeKey)

  const handleNarrativeNext = () => {
    if (narratives && narrativePageIndex < narratives.length - 1) {
      setNarrativePageIndex(narrativePageIndex + 1)
    } else {
      setDismissedForIndex((prev) => new Set([...prev, narrativeKey]))
      setNarrativePageIndex(0)
    }
  }

  if (hasNarrative) {
    const text = narratives[narrativePageIndex]
    const isEpilogue = narrativeKey === questionCount
    return (
      <ScenarioNarrative
        text={text}
        onNext={handleNarrativeNext}
        stepLabel={
          isEpilogue
            ? `${scenario.title} — エピローグ`
            : `${scenario.title} — ${currentQuestionIndex + 1}/${questionCount}問目の前に`
        }
      />
    )
  }

  return <QuizCard isModalOpen={isModalOpen} />
}

/** Scenario selection list for menu */
export function ScenarioList({ onSelect }: { onSelect: (scenarioId: string) => void }) {
  const { userProgress, allQuestions } = useQuizStore()

  return (
    <div className="space-y-3">
      {SCENARIOS.map((sc) => {
        const questionIds = sc.steps.filter((s) => s.type === 'question').map((s) => s.questionId!)
        const validIds = questionIds.filter((id) => allQuestions.some((q) => q.id === id))
        const answeredCount = validIds.filter((id) => userProgress.hasAttempted(id)).length
        const difficultyColors = {
          beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
          intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          advanced: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        }
        const difficultyLabels = { beginner: '初級', intermediate: '中級', advanced: '上級' }
        const isCompleted = answeredCount === validIds.length && validIds.length > 0

        return (
          <button
            key={sc.id}
            onClick={() => onSelect(sc.id)}
            className="tap-highlight flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98] dark:bg-stone-800"
          >
            <span className="mt-0.5 text-2xl">{sc.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-claude-dark">{sc.title}</h3>
                {isCompleted && <span className="text-emerald-500">✓</span>}
              </div>
              <p className="mt-0.5 text-sm text-stone-500">{sc.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColors[sc.difficulty]}`}>
                  {difficultyLabels[sc.difficulty]}
                </span>
                <span className="text-xs text-stone-400">
                  {validIds.length}問 · {answeredCount}/{validIds.length}回答済み
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
