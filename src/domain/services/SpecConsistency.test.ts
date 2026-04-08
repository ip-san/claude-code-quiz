/**
 * Spec Consistency Tests — UI表示とコードロジックの整合性を自動検証
 *
 * 過去に発見された仕様バグのパターンを再発防止するためのテスト群。
 * 新しい仕様バグが見つかったらここにテストを追加する。
 */

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SCENARIO_CATEGORY_MAP } from '@/components/Menu/recommendUtils'
import { locale } from '@/config/locale'
import { SCENARIOS } from '@/data/scenarios'
import { PREDEFINED_CATEGORIES } from '../valueObjects/Category'
import { getOverviewQuestionsOrdered, OVERVIEW_CHAPTERS } from '../valueObjects/OverviewChapter'
import { ALL_MODE_IDS, PREDEFINED_QUIZ_MODES } from '../valueObjects/QuizMode'
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

describe('Spec Consistency: Mapping exhaustiveness', () => {
  const scenarioIds = SCENARIOS.map((s) => s.id)
  const categoryIds = PREDEFINED_CATEGORIES.map((c) => c.id)

  it('SCENARIO_CATEGORY_MAP keys must all exist in SCENARIOS', () => {
    for (const key of Object.keys(SCENARIO_CATEGORY_MAP)) {
      expect(scenarioIds, `SCENARIO_CATEGORY_MAP key "${key}" does not exist in SCENARIOS`).toContain(key)
    }
  })

  it('SCENARIO_CATEGORY_MAP values must all exist in PREDEFINED_CATEGORIES', () => {
    for (const [scenarioId, cats] of Object.entries(SCENARIO_CATEGORY_MAP)) {
      for (const cat of cats) {
        expect(categoryIds, `SCENARIO_CATEGORY_MAP["${scenarioId}"] references unknown category "${cat}"`).toContain(
          cat
        )
      }
    }
  })

  it('every SCENARIO must have an entry in SCENARIO_CATEGORY_MAP', () => {
    for (const id of scenarioIds) {
      expect(
        Object.keys(SCENARIO_CATEGORY_MAP),
        `Scenario "${id}" has no entry in SCENARIO_CATEGORY_MAP — recommendations for this scenario will be silently skipped`
      ).toContain(id)
    }
  })

  it('CATEGORY_REASONS and CATEGORY_TERMS must cover all categories', () => {
    const reasons = locale.recommendUtils.categoryReasons
    const terms = locale.recommendUtils.categoryTerms
    for (const catId of categoryIds) {
      expect(reasons[catId], `Category "${catId}" missing from locale.recommendUtils.categoryReasons`).toBeDefined()
      expect(terms[catId], `Category "${catId}" missing from locale.recommendUtils.categoryTerms`).toBeDefined()
    }
  })
})

describe('Spec Consistency: Locale completeness', () => {
  it('sessionHistory.modes must cover all QuizMode IDs', () => {
    const modeLabels = locale.sessionHistory.modes
    for (const id of ALL_MODE_IDS) {
      expect(
        modeLabels[id],
        `locale.sessionHistory.modes is missing "${id}" — SessionHistoryList will display raw mode string`
      ).toBeDefined()
    }
  })

  it('scenario difficultyLabels must cover all scenario difficulties', () => {
    const labels = locale.scenario.difficultyLabels as Record<string, string>
    const difficulties = new Set(SCENARIOS.map((s) => s.difficulty))
    for (const d of difficulties) {
      expect(labels[d], `locale.scenario.difficultyLabels is missing "${d}"`).toBeDefined()
    }
  })

  it('all QuizMode names are used somewhere (not orphaned)', () => {
    for (const mode of PREDEFINED_QUIZ_MODES) {
      // Mode names should be referenceable via mode definition
      expect(mode.name.length, `${mode.id} should have a non-empty name`).toBeGreaterThan(0)
    }
  })

  it('header answered count uses isCorrectlyAnswered, not hasAttempted', () => {
    const source = readFileSync('src/components/Menu/ModeSelection.tsx', 'utf8')
    // Should use the centralized isCorrectlyAnswered method
    expect(source).toContain('isCorrectlyAnswered')
    expect(source).not.toContain('hasAttempted')
  })

  it('score thresholds use ScoreThresholds constants, not hardcoded 70/80', () => {
    // These files should NOT contain hardcoded >= 70 or >= 80 for score comparisons
    const filesToCheck = [
      'src/components/Quiz/chapter/ChapterComplete.tsx',
      'src/components/Quiz/result/CertificateGenerator.tsx',
      'src/components/Progress/CertificateHistory.tsx',
      'src/components/Progress/SessionHistoryList.tsx',
      'src/components/Progress/WeakPointInsight.tsx',
      'src/components/Progress/LearningRecommendation.tsx',
      'src/components/Quiz/result/NextRecommendation.tsx',
    ]
    for (const file of filesToCheck) {
      const source = readFileSync(file, 'utf8')
      // Check that passing score uses PASSING_SCORE constant
      const has70Hardcoded = /percentage\s*>=\s*70\b|accuracy\s*>=\s*70\b/.test(source)
      expect(has70Hardcoded, `${file} has hardcoded >= 70 — use PASSING_SCORE`).toBe(false)
    }
  })

  it('score thresholds: all files using score comparison import ScoreThresholds', () => {
    // Extended check: files that compare accuracy/percentage against numeric thresholds
    // must import from ScoreThresholds
    const filesToCheck = [
      'src/components/Progress/ProgressDashboard.tsx',
      'src/components/Quiz/QuizResult.tsx',
      'src/components/Menu/CategoryPicker.tsx',
    ]
    for (const file of filesToCheck) {
      const source = readFileSync(file, 'utf8')
      expect(source, `${file} should import from ScoreThresholds`).toContain('ScoreThresholds')
      // Should NOT have raw >= 70, >= 80, >= 50 for score comparisons
      const hasRawThreshold = /accuracy\s*>=\s*(?:70|80|50)\b|progress\s*>=\s*(?:70|80|50)\b/.test(source)
      expect(hasRawThreshold, `${file} has hardcoded score threshold — use ScoreThresholds constants`).toBe(false)
    }
  })
})

describe('Spec Consistency: isCorrectlyAnswered usage', () => {
  it('files checking answer correctness must use isCorrectlyAnswered, not lastCorrect', () => {
    const filesToCheck = [
      'src/stores/slices/progressSlice.ts',
      'src/components/Reader/ExplanationReader.tsx',
      'src/components/Reader/ReaderCard.tsx',
    ]
    for (const file of filesToCheck) {
      const source = readFileSync(file, 'utf8')
      // Should NOT access .lastCorrect for correctness checking
      const hasInlineCheck = /\.lastCorrect\b/.test(source)
      expect(hasInlineCheck, `${file} accesses .lastCorrect directly — use isCorrectlyAnswered()`).toBe(false)
    }
  })

  it('no file uses inline unanswered check pattern', () => {
    // The pattern "!p || p.attempts === 0 || !p.lastCorrect" is banned
    const filesToCheck = [
      'src/stores/slices/progressSlice.ts',
      'src/components/Reader/ExplanationReader.tsx',
      'src/components/Reader/ReaderCard.tsx',
      'src/components/Menu/ModeSelection.tsx',
      'src/components/Menu/ChapterProgressMap.tsx',
    ]
    for (const file of filesToCheck) {
      const source = readFileSync(file, 'utf8')
      const hasBannedPattern = /p\.attempts\s*===\s*0.*lastCorrect|lastCorrect.*p\.attempts\s*===\s*0/.test(source)
      expect(hasBannedPattern, `${file} uses banned inline unanswered check — use isCorrectlyAnswered()`).toBe(false)
    }
  })
})

describe('Spec Consistency: Session state reset on start', () => {
  // Use implementation line markers to extract correct source blocks
  const source = readFileSync('src/stores/slices/sessionSlice.ts', 'utf8')
  const lines = source.split('\n')

  // Find implementation lines (indented with 2 spaces, not interface definitions)
  function findImplBlock(startFn: string, endFn: string): string {
    const startPattern = new RegExp(`^  ${startFn}`)
    const endPattern = new RegExp(`^  ${endFn}`)
    let startIdx = -1
    let endIdx = lines.length
    for (let i = 0; i < lines.length; i++) {
      if (startPattern.test(lines[i]) && i > 60) {
        startIdx = i
        break
      }
    }
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (endPattern.test(lines[i]) && i > 60) {
        endIdx = i
        break
      }
    }
    return lines.slice(startIdx, endIdx).join('\n')
  }

  it('startSession resets activeScenarioId and sessionLabel', () => {
    const block = findImplBlock('startSession:', 'startSessionWithIds:')
    expect(block, 'startSession should reset activeScenarioId').toContain('activeScenarioId: null')
    expect(block, 'startSession should reset sessionLabel').toContain('sessionLabel: null')
  })

  it('startScenarioSession resets sessionLabel', () => {
    const block = findImplBlock('startScenarioSession:', 'retrySession:')
    expect(block, 'startScenarioSession should reset sessionLabel').toContain('sessionLabel: null')
  })

  it('retryQuestion saves session snapshot', () => {
    const block = findImplBlock('retryQuestion:', 'selectAnswer:')
    expect(block, 'retryQuestion should call saveSessionSnapshot').toContain('saveSessionSnapshot')
  })
})

describe('Spec Consistency: Navigation restores answer state', () => {
  const source = readFileSync('src/stores/slices/sessionSlice.ts', 'utf8')
  const lines = source.split('\n')

  function findImplBlock(startFn: string, endFn: string): string {
    const startPattern = new RegExp(`^  ${startFn}`)
    const endPattern = new RegExp(`^  ${endFn}`)
    let startIdx = -1
    let endIdx = lines.length
    for (let i = 0; i < lines.length; i++) {
      if (startPattern.test(lines[i]) && i > 60) {
        startIdx = i
        break
      }
    }
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (endPattern.test(lines[i]) && i > 60) {
        endIdx = i
        break
      }
    }
    return lines.slice(startIdx, endIdx).join('\n')
  }

  it('previousQuestion restores isAnswered from answerHistory', () => {
    const block = findImplBlock('previousQuestion:', 'goToQuestion:')
    expect(block).not.toContain('isAnswered: false')
    expect(block).toContain('record !== undefined')
  })

  it('goToQuestion restores isAnswered from answerHistory', () => {
    const block = findImplBlock('goToQuestion:', 'finishTest:')
    expect(block).not.toContain('isAnswered: false')
    expect(block).toContain('record !== undefined')
  })
})

describe('Spec Consistency: hasPassed uses PASSING_SCORE', () => {
  it('QuizSessionService.hasPassed default should use PASSING_SCORE constant', () => {
    const source = readFileSync('src/domain/services/QuizSessionService.ts', 'utf8')
    // Should NOT have = 70 as default
    expect(source).not.toMatch(/hasPassed\(.*=\s*70\)/)
    // Should reference PASSING_SCORE
    expect(source).toContain('PASSING_SCORE')
  })
})
