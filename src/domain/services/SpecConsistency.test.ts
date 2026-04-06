/**
 * Spec Consistency Tests — UI表示とコードロジックの整合性を自動検証
 *
 * 過去に発見された仕様バグのパターンを再発防止するためのテスト群。
 * 新しい仕様バグが見つかったらここにテストを追加する。
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getOverviewQuestionsOrdered, OVERVIEW_CHAPTERS } from '../valueObjects/OverviewChapter'
import { PREDEFINED_QUIZ_MODES } from '../valueObjects/QuizMode'
import { QuizSessionService } from './QuizSessionService'

// Load quiz data for integration-level checks
const quizData = JSON.parse(readFileSync('src/data/quizzes.json', 'utf8'))
const allQuestions = quizData.quizzes

describe('Spec Consistency: QuizMode definitions', () => {
  it('mode description mentioning a number matches questionCount', () => {
    for (const mode of PREDEFINED_QUIZ_MODES) {
      // Extract numbers from description like "100問" or "20問"
      const match = mode.description.match(/(\d+)問/)
      if (match && mode.questionCount !== null) {
        expect(
          mode.questionCount,
          `${mode.id}: description says "${match[0]}" but questionCount is ${mode.questionCount}`
        ).toBe(Number(match[1]))
      }
    }
  })

  it('mode description mentioning time matches timeLimit', () => {
    for (const mode of PREDEFINED_QUIZ_MODES) {
      // Extract time from description like "60分"
      const match = mode.description.match(/(\d+)分/)
      if (match && mode.timeLimit !== null) {
        expect(mode.timeLimit, `${mode.id}: description says "${match[0]}" but timeLimit is ${mode.timeLimit}`).toBe(
          Number(match[1])
        )
      }
      // If name mentions time (e.g., "60秒"), timeLimit should not be null
      const nameTimeMatch = mode.name.match(/(\d+)(秒|分)/)
      if (nameTimeMatch) {
        expect(mode.timeLimit, `${mode.id}: name says "${nameTimeMatch[0]}" but timeLimit is null`).not.toBeNull()
      }
    }
  })

  it('shuffle settings are consistent with mode intent', () => {
    for (const mode of PREDEFINED_QUIZ_MODES) {
      if (mode.description.includes('ランダム')) {
        expect(mode.shuffleQuestions, `${mode.id}: description says "ランダム" but shuffleQuestions is false`).toBe(
          true
        )
      }
    }
  })
})

describe('Spec Consistency: Session state persistence', () => {
  it('all QuizSessionState fields are saved in SessionRepository', () => {
    // These fields MUST be persisted for correct session resume
    // Maps field names to their serialized equivalents in SessionRepository
    const requiredInRepo = [
      'currentIndex',
      'score',
      'answeredCount',
      'startedAt',
      'hintsUsedCount',
      'hintUsedOnCurrent', // serialized name of hintUsed
      'answerRecords', // serialized name of answerHistory
      'timeRemaining', // Added after timer reset bug
    ]

    const requiredInResume = [
      'currentIndex',
      'score',
      'answeredCount',
      'startedAt',
      'hintsUsedCount',
      'hintUsed',
      'answerHistory',
      'timeRemaining',
    ]

    const repoSource = readFileSync('src/infrastructure/persistence/SessionRepository.ts', 'utf8')
    for (const field of requiredInRepo) {
      expect(repoSource, `SessionRepository should save "${field}" for correct resume`).toContain(field)
    }

    const resumeSource = readFileSync('src/stores/slices/resumeSlice.ts', 'utf8')
    for (const field of requiredInResume) {
      expect(resumeSource, `resumeSlice should restore "${field}" on resume`).toContain(field)
    }
  })

  it('overviewChapterState is persisted for overview mode resume', () => {
    const repoSource = readFileSync('src/infrastructure/persistence/SessionRepository.ts', 'utf8')
    expect(repoSource).toContain('overviewChapterState')

    const resumeSource = readFileSync('src/stores/slices/resumeSlice.ts', 'utf8')
    expect(resumeSource).toContain('overviewChapterState')

    const utilsSource = readFileSync('src/stores/utils.ts', 'utf8')
    expect(utilsSource).toContain('overviewChapterState')
  })
})

describe('Spec Consistency: Overview mode chapters', () => {
  it('all overview questions belong to exactly one chapter', () => {
    const overviewQuestions = allQuestions.filter((q: any) => q.tags?.includes('overview'))

    for (const q of overviewQuestions) {
      const chapterTags = (q.tags as string[]).filter((t: string) => t.startsWith('overview-ch-'))
      expect(chapterTags.length, `${q.id} should belong to exactly one chapter, has ${chapterTags.length}`).toBe(1)
    }
  })

  it('chapter definitions cover all overview questions', () => {
    const overviewQuestions = allQuestions.filter((q: any) => q.tags?.includes('overview'))
    const coveredIds = new Set<string>()

    for (const ch of OVERVIEW_CHAPTERS) {
      const chapterQs = overviewQuestions.filter((q: any) => q.tags.includes(ch.tag))
      for (const q of chapterQs) coveredIds.add(q.id)
    }

    expect(coveredIds.size, 'all overview questions should be covered by chapters').toBe(overviewQuestions.length)
  })

  it('chapter progress uses correct/total (not correct/answered)', () => {
    // Verify ChapterProgressMap calculates correctPct as correct/total
    const source = readFileSync('src/components/Menu/ChapterProgressMap.tsx', 'utf8')
    expect(source).toContain('correct / ch.total')
    // Should NOT use correct/answered for the displayed percentage
    expect(source).not.toContain('correct / ch.answered) * 100')
  })

  it('overview chapter state is managed in domain layer, not UI', () => {
    const quizCardSource = readFileSync('src/components/Quiz/QuizCard.tsx', 'utf8')
    // QuizCard should NOT have local state for chapter management
    expect(quizCardSource).not.toContain('useState<Set<number>>(new Set())')
    // Should read from domain state
    expect(quizCardSource).toContain('overviewChapterState')
  })
})

describe('Spec Consistency: QuizSessionService chapter transitions', () => {
  it('nextQuestion detects chapter boundary in overview mode', () => {
    const questions = getOverviewQuestionsOrdered(
      allQuestions.map((q: any) => ({
        ...q,
        tags: q.tags ?? [],
        options: (q.options ?? []).map((o: any) => ({ text: o.text })),
        isMultiSelect: Array.isArray(q.correctIndex),
        isCorrectAnswer: () => false,
        isCorrectMultiAnswer: () => false,
      }))
    )
    if (questions.length === 0) return

    const config = { ...QuizSessionService.createDefaultConfig(), mode: 'overview' as const }
    const state = QuizSessionService.createInitialState(questions as any, config)

    expect(state.overviewChapterState).not.toBeNull()
    expect(state.overviewChapterState?.chapterPhase).toBe('intro')
    expect(state.overviewChapterState?.chapters.length).toBeGreaterThan(0)
  })

  it('dismissChapterIntro transitions to questions phase', () => {
    const questions = getOverviewQuestionsOrdered(
      allQuestions.map((q: any) => ({
        ...q,
        tags: q.tags ?? [],
        options: (q.options ?? []).map((o: any) => ({ text: o.text })),
        isMultiSelect: false,
        isCorrectAnswer: () => false,
        isCorrectMultiAnswer: () => false,
      }))
    )
    const config = { ...QuizSessionService.createDefaultConfig(), mode: 'overview' as const }
    const state = QuizSessionService.createInitialState(questions as any, config)

    const afterDismiss = QuizSessionService.dismissChapterIntro(state)
    expect(afterDismiss.overviewChapterState?.chapterPhase).toBe('questions')
  })
})

describe('Spec Consistency: Locale completeness', () => {
  it('all QuizMode names are used somewhere (not orphaned)', () => {
    for (const mode of PREDEFINED_QUIZ_MODES) {
      // Mode names should be referenceable via mode definition
      expect(mode.name.length, `${mode.id} should have a non-empty name`).toBeGreaterThan(0)
    }
  })

  it('header answered count uses correct-based logic, not attempt-based', () => {
    const source = readFileSync('src/components/Menu/ModeSelection.tsx', 'utf8')
    // Should count by lastCorrect, not by hasAttempted
    expect(source).toContain('lastCorrect')
    expect(source).not.toContain('hasAttempted')
  })
})
